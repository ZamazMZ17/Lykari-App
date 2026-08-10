/**
 * El navegador graba en el formato que quiere (en Android, casi siempre
 * webm/opus). Gemini no acepta ese contenedor, así que al enviar se convierte
 * a WAV mono de 16 kHz — de sobra para voz y aceptado por todos los
 * proveedores. El original nunca se toca: se guarda tal como se grabó.
 */

export const TASA_DESTINO = 16_000;

/** WAV PCM 16 bits, mono. Sin dependencias: son 44 bytes de cabecera. */
export function codificarWav(muestras: Float32Array, tasa: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(buffer);

  const texto = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };

  texto(0, "RIFF");
  v.setUint32(4, 36 + muestras.length * 2, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true); // tamaño del bloque fmt
  v.setUint16(20, 1, true); // PCM sin comprimir
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, tasa, true);
  v.setUint32(28, tasa * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por muestra
  v.setUint16(34, 16, true); // bits por muestra
  texto(36, "data");
  v.setUint32(40, muestras.length * 2, true);

  for (let i = 0; i < muestras.length; i++) {
    const m = Math.max(-1, Math.min(1, muestras[i]));
    // Asimétrico a propósito: el rango de un entero de 16 bits con signo
    // llega a -32768 pero solo a 32767.
    v.setInt16(44 + i * 2, m < 0 ? m * 0x8000 : m * 0x7fff, true);
  }
  return buffer;
}

export async function aWavMono16k(blob: Blob): Promise<Blob> {
  const datos = await blob.arrayBuffer();

  const ctx = new AudioContext();
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(datos);
  } finally {
    void ctx.close();
  }

  const destino = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(audio.duration * TASA_DESTINO)),
    TASA_DESTINO,
  );
  const fuente = destino.createBufferSource();
  fuente.buffer = audio;
  fuente.connect(destino.destination);
  fuente.start();
  const rendido = await destino.startRendering();

  return new Blob([codificarWav(rendido.getChannelData(0), TASA_DESTINO)], {
    type: "audio/wav",
  });
}

/** Base64 sin el prefijo `data:`, que es lo que espera la API. */
export async function aBase64(blob: Blob): Promise<string> {
  const texto = await new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
  return texto.slice(texto.indexOf(",") + 1);
}
