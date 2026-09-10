---
name: dictado-nativo
description: Transcribe voz a texto con el reconocedor del propio teléfono (Android SpeechRecognizer) en vez de mandar el audio a una API de IA. Úsala cuando una app Capacitor/React necesite dictado —un campo que se llena hablando, una orden por voz, una nota— o cuando haya que quitar de en medio una transcripción que hoy consume cuota de Gemini/OpenAI/Whisper. También cuando el dictado ya existe pero se corta a mitad de frase, tarda varios segundos, o "hablo y no pasa nada".
---

# Dictado con el reconocedor del teléfono

Transcribir es lo único de la voz que Android ya hace gratis, sin conexión y al
instante. Mandar el audio a una API para eso quema cuota en la tarea más barata
y falla justo cuando se acaba el plan gratuito.

Esta habilidad instala el reconocedor del sistema —el mismo servicio de Google
que dicta en el teclado— como plugin de Capacitor, con las opciones que hacen
que funcione de verdad en un dictado real.

**Deja la API de IA para lo que sí necesita una IA** (entender, resumir,
decidir). La transcripción entra como texto.

## Cuándo NO usarla

- **iOS.** El plugin es Android (`SpeechRecognizer`). En iOS hay que escribir el
  equivalente con `SFSpeechRecognizer`; el lado JS de `reconocimiento.ts` sirve
  igual, cambia solo el nativo.
- **Audio que hay que guardar** (una nota de voz que se reescucha, un diario).
  Ahí sí se graba el blob. Se pueden combinar: grabar el audio *y* dictar en
  paralelo, y usar el dictado como transcripción gratis.
- **Cuando importa el audio, no las palabras** (tono, ruido de fondo, varios
  hablantes). Eso es trabajo de un modelo, no del reconocedor del teléfono.

## Instalar

Las tres piezas están en `plantillas/`. Copiar tal cual y ajustar el paquete:

1. **`Reconocedor.java`** → `android/app/src/main/java/<tu/paquete>/`.
   Cambia la primera línea, `package`.
2. **`reconocedorNativo.ts`** y **`reconocimiento.ts`** → `src/voz/`.
   `reconocimiento.ts` importa `esNativo` (`Capacitor.isNativePlatform()`);
   ajusta esa ruta y el nombre de la app en los mensajes de error.
3. **Registrar el plugin** en `MainActivity.java`, **antes** de
   `super.onCreate` — ahí es cuando Capacitor arma el puente:
   ```java
   registerPlugin(Reconocedor.class);
   super.onCreate(savedInstanceState);
   ```
4. **`AndroidManifest.xml`**: el permiso y —esto es lo que se olvida— la
   consulta de paquetes:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <queries>
       <intent><action android:name="android.speech.RecognitionService" /></intent>
   </queries>
   ```
5. **Usarlo** desde el componente:
   ```tsx
   const voz = useReconocedor((texto) => setCampo(texto));
   const escuchando = voz.estado === "pidiendo" || voz.estado === "escuchando";
   // mantener pulsado: onPointerDown -> voz.iniciar()
   // soltar (en window, no en el botón): voz.detener()
   // pointercancel: voz.cancelar()
   ```

Después de tocar `android/`, hay que recompilar el APK: `npx cap sync android`
y volver a construir. Un APK viejo no trae el plugin y toda llamada revienta
con «not implemented» — por eso `esPluginAusente()` existe, para poder decirlo
en vez de fallar en silencio.

## Las cinco trampas

Cada una está resuelta en las plantillas. Si se reescribe desde cero, se
vuelven a pisar todas:

1. **Android corta a los ~2 segundos de silencio.** Nadie dicta una frase larga
   sin pausas, así que la escucha se cierra a media orden. Se piden silencios
   largos (`EXTRA_SPEECH_INPUT_*`, ~4 s) **y** el lado JS reabre la escucha sola
   al cerrarse un tramo, acumulando el texto. La escucha termina cuando el
   usuario suelta, no cuando el teléfono se cansa.
2. **Sin `<queries>`, en Android 11+ la app ni ve el servicio de voz.** Falla en
   silencio en el teléfono y funciona perfecto en el navegador, que es la peor
   combinación para depurar.
3. **Reutilizar el `SpeechRecognizer` tras un error lo deja «ocupado»**
   (`ERROR_RECOGNIZER_BUSY`): es la causa clásica de «le hablo y no pasa nada».
   Cada arranque crea uno nuevo y destruye el anterior.
4. **`EXTRA_PREFER_OFFLINE`.** Sin esto, con señal débil el servicio intenta ir
   a la red y se queda pensando varios segundos: esa es la demora que se siente
   al dictar. Con el paquete de idioma descargado corre en el teléfono. Si el
   servicio contesta que no tiene el idioma, el JS baja la bandera y reintenta
   por red — mejor lento que mudo.
5. **El último parcial no es el resultado.** Al cerrar un tramo el servicio
   entrega en `onResults` una versión repasada, mejor puntuada. Hay que emitirla
   y dejar que pise al parcial.

Extra: `SpeechRecognizer` **exige el hilo principal** para todo, crear incluido
(`runOnUiThread`).

## Sesgar el reconocimiento hacia tus palabras

`frasesFavorecidas` manda al servicio nombres propios que la app ya conoce
—nombres de clientes, de actividades, de cursos, el nombre del asistente— para
que no los confunda («Ayde» contra «aire»). Android 13+ los usa; antes se
ignoran. Son datos locales que van al reconocedor del sistema, no a una IA.

## Diseño de la interacción

Mantener pulsado para hablar y soltar para cerrar, como un audio de WhatsApp.
Dos detalles que importan:

- **Escuchar el `pointerup` en `window`, no en el botón.** Si el botón se
  reemplaza por otra cosa mientras se escucha, se desmonta antes de que
  levantes el dedo y la escucha no se cierra nunca.
- **Por defecto, dejar el texto para revisar antes de actuar.** El
  reconocimiento se equivoca; si lo dictado dispara algo irreversible (ejecutar
  una orden, mandar un mensaje), el envío automático debe ser una opción
  explícita en Ajustes, no lo predeterminado.

## De dónde sale

Escrito y probado en **Don Pio** (`src/voz/`, reparto real, dictado con ruido y
pausas) y portado a **Lykari** para la pantalla de Sam, donde reemplazó una
transcripción que gastaba cuota de Gemini en cada indicación.
