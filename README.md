# Lykari

PWA local-first de registro personal. El contexto y las decisiones del proyecto
están en [CLAUDE.md](CLAUDE.md); esto es solo cómo correrla.

**Estado: fases 1 a 5 terminadas** — registra el día, captura por voz, cierra
el día con la IA, muestra el camino, lleva la mascota con su racha y exporta el
diario a `.docx`.

La integración con Google Calendar se dejó fuera a propósito: los pendientes ya
tienen alarmas nativas que llegan con la app cerrada, así que el calendario era
comodidad y no necesidad. Si algún día hace falta, la forma barata es abrir
Google Calendar con el evento prerrellenado por URL, sin OAuth ni permisos.

Hace falta poner la API key en Ajustes para que la IA transcriba y analice.

**Modo oscuro** en Ajustes → Apariencia: claro, oscuro o «sistema» (sigue al
teléfono). El tema oscuro se deriva del claro respetando §4 —sigue siendo verde
con negro dentro, sin rojo, con el ámbar de un solo significado y las cinco
secciones equilibradas entre sí— y vive en `src/lib/tema.ts`. En el APK ajusta
además la barra de estado del sistema para que el reloj se lea en ambos temas.

**Copia entre dispositivos.** No hay sincronización automática —cada teléfono o
tablet tiene su propia base local, por diseño (§3, sin servidor propio)— pero en
Ajustes → Copia de seguridad se exporta todo el registro (con los audios) a un
archivo `.json`, se pasa al otro aparato y se importa ahí. Importar reemplaza,
no mezcla, y se confirma antes. Vive en `src/exportar/respaldo.ts`.

Lo que la copia **no** lleva: los ajustes del dispositivo (la API key, el tema,
la posición de la mascota). Meter la key en un archivo que se comparte la
dejaría expuesta; la key se pone en cada dispositivo por separado.

## Correr

```bash
npm install
npm run dev
```

## Compilar el APK

```bash
npm run apk
```

Compila la web, la mete en el proyecto de `android/`, genera el APK y lo
instala en el teléfono conectado. Necesita un JDK 17 o más nuevo: el script
busca el que trae Android Studio, y si no lo encuentra se le puede indicar con
`LYKARI_JAVA_HOME`.

El APK es la versión de verdad: pantalla completa, ícono propio y —desde la
fase 3— notificaciones del sistema que llegan con la app cerrada, que es lo
que una PWA no puede hacer en Android.

## Probar en el navegador del celular (depuración USB)

```bash
npm run telefono
```

Usa `adb reverse`, así que el teléfono ve la app en `http://localhost:5173`.
Eso importa: `localhost` cuenta como origen seguro, y sin eso Android no
registra el service worker ni deja instalar la PWA.

Para probar la instalación y el modo sin conexión hace falta el build real
(en desarrollo el service worker está apagado a propósito):

```bash
npm run build && npm run preview
npm run telefono 4173
```

Luego, en el menú del navegador → **Añadir a pantalla de inicio**.

## Otros comandos

```bash
npm test
```

- `npm run iconos` — regenera todos los íconos: los del manifiesto de la PWA y
  los del APK en cada densidad.

  **`marca/logo.png` es la fuente del ícono.** El dibujo que trae el script es
  solo el respaldo para cuando ese archivo no está. Del original se recorta el
  margen sobrante, se toma su color de fondo de una esquina y se rellena con
  él, para que la marca no salga diminuta en la pantalla de inicio.

  El único que se dibuja siempre es el de la barra de estado: Android lo pinta
  de un solo color plano y de una imagen a color no sale nada legible.
- `/reset.html` — borra la base local. Solo para pruebas.
- `node scripts/inspeccionar.mjs "<expresión>"` — evalúa JavaScript dentro de
  la WebView del APK por el protocolo de depuración de Chrome. Es la única
  forma de ver qué pasa de verdad en el dispositivo cuando el navegador de
  escritorio dice una cosa y el teléfono hace otra.

## Cómo está organizado

```
src/
  db/db.ts          esquema de IndexedDB (Dexie)
  db/acciones.ts    actividades y sesiones
  db/capturas.ts    capturas de voz y tareas
  db/agregados.ts   sumas por día, semana, mes y actividad
  ia/gemini.ts      transporte: la única pieza atada al proveedor
  ia/prompts.ts     qué se le pide a la IA en cada sección y en el cierre
  ia/procesar.ts    captura guardada → IA → resultado
  ia/cierre.ts      el análisis de la noche y las tareas que caducan
  ia/audio.ts       conversión a WAV mono 16 kHz al enviar
  notificaciones.ts recordatorios del sistema (solo en el APK)
  exportar/docx.ts  el diario a Word, generado bajo demanda
  exportar/respaldo.ts  copia de todo el registro para pasarlo entre aparatos
  lib/tema.ts       claro / oscuro / sistema, con la barra de estado nativa
  lib/tiempo.ts     aritmética del cronómetro y del cierre automático
  lib/fecha.ts      día lógico y alcances (hoy / semana / mes)
  lib/grabacion.ts  MediaRecorder y la onda en vivo
  lib/racha.ts      las reglas de la racha, sin tocar la base
  db/mascota.ts     piezas de la semana y estado de la racha
  ui/Husky.tsx      la mascota en SVG
  ui/Burbuja.tsx    la burbuja flotante que se arrastra y se ancla
  pantallas/        las pantallas y las hojas modales
  ui/piezas.tsx     Header, Hoja, Anillo, Barra
```

### Las dos disposiciones

`useDisposicion()` (en `src/lib/ganchos.ts`) elige entre dos, con el corte en
720 px de ancho:

- **compacta** — celular. Navegación abajo, una columna, una pantalla a la vez.
- **amplia** — tablet. Riel de navegación a la izquierda, actividades en varias
  columnas, y Capturar como maestro-detalle: la lista de secciones queda fija
  al lado del contenido, sin entrar y volver.

No son dos interfaces: son las mismas pantallas, que reciben un `amplia` o un
`onBack` opcional y se acomodan.

Cuatro cosas que conviene saber antes de tocar el código:

- **El tiempo nunca se acumula en memoria.** Cada sesión guarda `inicio`,
  `fin` y sus `pausas`, y la duración se recalcula desde ahí. Por eso el
  cronómetro sobrevive a cerrar la app, recargar o bloquear el teléfono.
- **No hay cron.** El cierre automático de las actividades de enfoque y el
  cambio de día se resuelven al abrir la app y al volver a ella
  (`reconciliarSesiones`), cerrando la sesión en el instante exacto en que
  llegó a las 3 h, nunca inventando el tiempo posterior.
- **El audio se guarda antes de llamar a la IA.** Si no hay key, no hay red o
  el proveedor falla, la captura queda como `nueva` con el error escrito y se
  puede reintentar. Nunca se pierde lo que se dijo.
- **El original no se toca.** Se guarda tal como lo grabó el navegador
  (en Android, webm/opus) y la conversión a WAV se hace solo al enviar, porque
  Gemini no acepta ese contenedor.
- **El ícono de una actividad es su categoría.** Las piezas de la mascota
  necesitan saber qué actividad es «lectura» o «ejercicio», y el modelo no
  tiene categorías. En vez de inventarlas, se usa el ícono que el usuario
  eligió al crear la actividad: `book` es lectura, `dumbbell` ejercicio,
  `lang` inglés. Se elige una sola vez y no hay que mantener nada.
- **El modelo se edita desde Ajustes.** Los nombres cambian cada pocos meses y
  no todos existen para toda key: comprobado contra la API, `gemini-2.5-flash`
  devuelve 404 donde `gemini-3.5-flash` funciona. Por eso no está en el código.
- **A la API solo van resúmenes.** El cierre manda el detalle del día más un
  contexto agregado de 14 días (minutos por día, días sin registro de cada
  actividad). Nunca audio de días pasados ni transcripciones viejas: el
  historial completo se queda en el teléfono para poder cambiar de proveedor
  sin perder nada.
