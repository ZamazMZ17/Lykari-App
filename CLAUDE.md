# Registro personal — contexto del proyecto

Este archivo es la memoria del proyecto. Léelo entero antes de escribir código.
Las decisiones marcadas como **cerradas** ya se discutieron y no se vuelven a abrir
salvo que el dueño del proyecto lo pida.

---

## 1. Qué es

Una app personal de registro y análisis. Un solo usuario. Sirve para dos cosas:

1. **Registrar lo que de verdad hizo** durante el día (sesiones de actividad).
2. **Capturar lo que se le ocurre** por voz (ideas de música, video, negocio, diario, pendientes).

Cada noche, una IA analiza todo lo registrado y al día siguiente devuelve un análisis
crítico, estadísticas y hasta 3 tareas.

## 2. El principio rector

El usuario ya intentó un horario rígido de 30 días y lo abandonó. Su problema no es
el tiempo: es el **compromiso de duración**. Se traba al retomar (ej. entre series de
ejercicio) y cuando el bloque planificado se vence sin haber terminado, lo vive como fracaso.

**Por lo tanto, la app NO mide cumplimiento contra un plan.** Registra lo que pasó.
La métrica es frecuencia y volumen acumulado, nunca adherencia. No existe el estado "fallaste".

Todo lo que sigue se deriva de esto. Si una decisión de implementación contradice este
principio, la decisión está mal.

---

## 3. Decisiones técnicas cerradas

| Tema | Decisión |
|---|---|
| Plataforma | **PWA** instalable, pensada para celular (Android) |
| Almacenamiento | **IndexedDB**, local-first. Nada de servidor propio |
| IA | Llamada directa a la API con la **key del usuario**, guardada en el dispositivo |
| Transcripción | Si el proveedor acepta audio directo, se manda el audio. Si no, transcribir primero |
| Cierre del día | **No hay cron.** Se ejecuta al abrir la app por primera vez después de medianoche |
| Calendario | Integración con Google Calendar solo para Pendientes, y en fase 3 |
| Mascota flotante | Solo **dentro** de la app. Nunca superpuesta al sistema operativo |

Notas:
- La key va en el dispositivo. No publicar la app con la key dentro.
- Todo el historial vive local para poder cambiar de proveedor de IA sin perder nada.
  A la API solo se manda el resumen del día.

---

## 4. Sistema de diseño

Tokens exactos (ya validados visualmente, no improvisar otros):

```
--ground:  #DCE0D9   fondo (verde salvia grisáceo)
--paper:   #F3F5F0   tarjetas
--ink:     #151A12   texto (negro con verde dentro, no negro puro)
--ink2:    #5D6656   texto secundario
--line:    #C6CCC0   bordes
--pino:    #1F4D3F   acciones primarias
--ambar:   #C98209   SOLO significa "algo está corriendo ahora" + racha
--musica:  #7B4EA3
--video:   #1E6E8C
--negocio: #A66200
--diario:  #9C3F5C
--pend:    #2F6B4F
```

Tipografías (Google Fonts):
- **Fraunces** — títulos de pantalla y el texto del diario. Con restricción.
- **Instrument Sans** — toda la interfaz.
- **JetBrains Mono** — números, duraciones, numeración de actividades, etiquetas eyebrow.

Reglas de color que no se rompen:
- **No existe el rojo en la app.** El rojo se lee como castigo. Los días vacíos son grises.
- El ámbar tiene un solo significado. Si se usa para otra cosa, deja de funcionar.
- Los 5 colores de sección tienen valor y saturación equivalentes: ninguna sección pesa más.
- **Íconos, nunca emojis.** Librería: lucide.

---

## 5. Pantallas

Navegación inferior de 3: **Hoy · Capturar · Camino**.
El prototipo visual está en `referencia/registro-pantallas.jsx` — replicar ese layout.

### Hoy (tablón)
- Actividades **numeradas** (01, 02…), con ícono, nombre, chip de alcance y barra de progreso.
- Al crear una actividad se elige **alcance**: solo hoy / toda la semana / todo el mes.
  Con semana o mes, la actividad aparece en el tablón todos los días de ese periodo.
- **Tiempo de referencia** opcional (ej. 30 min). Es solo una marca visual.
  No corta la sesión, no cambia de color al pasarse, no cuenta como fallo. Superarlo es normal.
- Botón iniciar por actividad. Franja superior con minutos registrados / sesiones / actividades.

### Sesión
- Cronómetro grande en mono. Botones: pausar → continuar, y finalizar.
- **Cierre automático según el tipo de actividad** (se define al crearla):
  - *Enfoque* (estudiar, leer, ejercicio): se cierra sola a las **3 h**, dejando el audio pendiente.
  - *Recreativa* (series, películas): **nunca se cierra sola.** Avisa a las 2 h y sigue contando.
    Razón: cerrarla escondería el tiempo real, que es justo el dato que el usuario necesita ver.
- Barra persistente de sesión activa visible desde cualquier pantalla.

### Cerrar sesión (hoja modal)
- Antes de finalizar hay que **grabar un audio** (o escribir) contando qué hizo y qué opina.
- Existe un escape: "guardar y dejar el audio pendiente". No bloquear al usuario, pero que el
  camino por defecto sea grabar.

### Capturar
Cinco secciones, cada una con su color e ícono:
- **Música, Video, Negocio** — graba audio → la IA lo sintetiza en un **título corto**
  (como el nombre de un chat) que al tocarlo despliega la descripción estructurada.
  Sin fechas, sin recordatorios. Solo marcar hecha o eliminar.
  En Música, además, la IA estructura la letra y sugiere qué tipo de canción podría ser.
- **Diario** — solo audio. La IA lo transcribe **en primera persona**, como si lo hubiera
  escrito él. Se guarda en la app y se exporta a `.docx` bajo demanda (no mantener un Word vivo).
  Recordatorio a las 8:00 pm si no grabó nada ese día.
- **Pendientes** — del audio salen tareas con fecha de vencimiento, recordatorio, marcar hecha
  o eliminar. Al tocar una tarea se abre su descripción. Es la única sección con fechas y alarmas.

### Camino (feedback)
- Un riel de círculos: el relleno de cada anillo es el tiempo registrado.
- **Tres niveles de zoom**: días → semanas del año → los 12 meses.
  Abre siempre en el día/semana/mes actual, y se puede navegar a cualquier periodo pasado.
- Debajo, el análisis del día seleccionado y el reparto de tiempo por actividad.

---

## 6. Mascota y racha

Prototipo en `referencia/mascota-racha.jsx`. El SVG de ahí es un panda rojo:
**hay que rehacerlo como husky** (gris, blanco, negro), manteniendo la misma calidad de
sombreado, gradientes y animaciones (respiración, parpadeo, cola, orejas, flotación).
Como el husky es frío, **la bufanda pasa a ámbar** para que sea lo único con color encima.

Comportamiento:
- Flota como **burbuja de 56 px dentro de la app**, en las tres pantallas. Se arrastra y se
  ancla al borde más cercano al soltarla. Recuerda su posición.
- Zona muerta: nunca queda encima de la navegación ni de la barra de sesión activa.
- **Un toque abre una hoja**, no navega fuera de la pantalla actual. La hoja muestra mascota,
  racha y piezas de la semana, con un enlace a Camino para el análisis completo.
- Con una sesión corriendo, la burbuja lleva un **anillo ámbar** que se llena con el tiempo.
- Se puede esconder arrastrándola fuera del borde; reaparece al día siguiente.

Reglas de la racha:
- Cuenta **días con registro**, no días perfectos.
- **Un día libre por semana** no rompe la racha. Dos seguidos sí.
- Al romperse **no vuelve a cero**: la bufanda se acorta pero cada 7 días ganados dejan un
  **nudo ámbar permanente**. Lo ya hecho no se borra por fallar después.
- La ropa se **recalcula cada lunes** según lo que hizo esa semana. Si dejó de leer, los lentes
  se caen. La mascota muestra el presente, no su mejor mes.

Piezas y qué las desbloquea (ajustables, pero el espíritu es constancia > maratón):
lentes = lectura 4 de 7 días · pesa = 3 sesiones de ejercicio · banderín = inglés 5 días
distintos · audífonos = 4 ideas de música · cámara = ideas de video en 4 días distintos ·
maletín = una idea de negocio con tareas hechas · lápiz = 6 noches de diario.

**Lo que la mascota nunca hace:** poner cara triste, llorar, mandar notificaciones de culpa,
ni felicitar por días vacíos. Eso es manipulación y contradice el análisis honesto que se pidió.

---

## 7. Modelo de datos (IndexedDB)

```
actividades  { id, nombre, icono, alcance:'hoy'|'semana'|'mes', desde, hasta,
               referenciaMin, tipo:'enfoque'|'recreativa', activa }
sesiones     { id, actividadId, inicio, fin, pausas[], audioBlob, transcripcion,
               cerradaAuto:bool, audioPendiente:bool }
capturas     { id, tipo:'musica'|'video'|'negocio'|'diario'|'pendiente',
               fecha, audioBlob, transcripcion, titulo, descripcion, estado }
tareas       { id, texto, origenCapturaId, vence, recordatorio, hecha }
cierres      { fecha, estadisticas, analisis{}, tareasPropuestas[] }
racha        { dias, nudos, ultimoDiaConRegistro, diaLibreUsadoEnSemana }
```

## 8. El cierre del día

Junta las sesiones y capturas del día en un JSON, lo manda con un prompt fijo y pide
respuesta también en JSON: `{ resumen, analisis:{sostuvo, cayo, costo, seRepite}, tareas[] }`.

**Tono del análisis — esto se discutió a fondo, respetarlo:**
- Crítico y neutro. El usuario **no quiere positivismo**: quiere lo bueno y lo malo para no
  cegarse a lo que lo está consumiendo sin darse cuenta.
- Critica **el patrón, no a la persona**. "Once días sin ejercicio y sigue en el tablón" sirve.
  "Eres inconstante" es una etiqueta inaccionable.
- **Solo puede opinar sobre lo que fue registrado.** Si no hay datos de un día, dice
  "no hay registro", nunca "fuiste flojo". No inventa conclusiones sobre lo que no existe.
- Nunca menciona lo que "debería" haber hecho según un plan. No hay plan.
- Máximo **3 tareas** por día, y caducan a los 7 días si no se hacen. Una lista infinita de
  tareas reproduce exactamente la trampa del horario de 30 días.

## 9. Fases

1. **Esqueleto** — navegación, IndexedDB, tablón con alcances, sesiones reales con
   pausa/continuar/finalizar y cierre automático por tipo. Sin audio, sin IA.
2. **Voz** — grabación, almacenamiento de blobs, transcripción, las cinco secciones de captura.
3. **Análisis** — cierre del día, pantalla Camino con los tres zooms, tareas, recordatorios.
4. **Mascota** — husky en SVG, burbuja flotante, racha con nudos, recálculo semanal.
5. Exportar `.docx` del diario y Google Calendar.

No adelantar fases. El objetivo de la fase 1 es que pueda registrar un día completo.

## 10. Referencia visual

- `referencia/registro-pantallas.jsx` — prototipo navegable de las 9 pantallas.
- `referencia/mascota-racha.jsx` — mascota animada, sistema de piezas y racha.

Son prototipos: el código es de referencia visual, no la arquitectura final.
Los colores, espaciados, tamaños de tipografía y microcopy sí se toman literalmente de ahí.
