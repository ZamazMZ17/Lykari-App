/**
 * El navegador graba en el formato que quiere (en Android, casi siempre
 * webm/opus). Gemini no acepta ese contenedor, así que al enviar se convierte
 * a WAV mono de 16 kHz — de sobra para voz y aceptado por todos los
 * proveedores. El original nunca se toca: se guarda tal como se grabó.
 */

export const TASA_DESTINO = 16_000;

/**
 * Gemini acepta hasta 20 MB por petición, contando el audio ya en base64
 * (que infla un tercio). Se deja aire para el prompt y el esquema.
 */
export const LIMITE_INLINE_BYTES = 18 * 1024 * 1024;

/** Pico al que se lleva la voz, con aire para no recortar. */
const PICO_DESTINO = 0.95;
/**
 * Tope de amplificación. Sin esto, una grabación casi muda (el micrófono
 * tapado, o nadie hablando) se subiría 90 veces y llegaría a la IA como un
 * siseo fortísimo, que transcribe peor que el silencio.
 */
const GANANCIA_MAX = 8;
/** Por debajo de esto la señal es plana: no hay nada que normalizar. */
const PISO_SENAL = 1e-4;

/**
 * El micrófono de un teléfono graba bajo, y más si se habla a un brazo de
 * distancia. Llevar el pico a un nivel constante antes de enviar mejora lo
 * que entiende la IA sin tocar el original, que se guarda tal cual se grabó.
 */
export function normalizar(muestras: Float32Array): Float32Array {
  let pico = 0;
  for (const m of muestras) {
    const abs = Math.abs(m);
    if (abs > pico) pico = abs;
  }
  if (pico < PISO_SENAL) return muestras;

  const ganancia = Math.min(PICO_DESTINO / pico, GANANCIA_MAX);
  // Ya estaba en su sitio: no vale la pena recorrer todo el audio otra vez.
  if (Math.abs(ganancia - 1) < 0.01) return muestras;

  const salida = new Float32Array(muestras.length);
  for (let i = 0; i < muestras.length; i++) salida[i] = muestras[i] * ganancia;
  return salida;
}

/** Ventana con la que se mide el volumen para buscar dónde empieza la voz. */
const VENTANA_MS = 20;
/** Cuánto se deja a cada lado, para no comerse el ataque de la primera palabra. */
const MARGEN_MS = 150;
/**
 * Relativo al tramo más fuerte, no absoluto: una grabación entera en voz baja
 * se quedaría sin nada con un umbral fijo.
 */
const UMBRAL_RELATIVO = 0.06;

/**
 * Quita el silencio del principio y del final. Con el gesto de «tocar para
 * empezar» siempre queda aire muerto mientras la mano vuelve, y ese tramo
 * ocupa lugar en la petición y no aporta nada a la transcripción.
 */
export function recortarSilencio(muestras: Float32Array, tasa: number): Float32Array {
  const ventana = Math.max(1, Math.round((tasa * VENTANA_MS) / 1000));
  if (muestras.length <= ventana) return muestras;

  // Volumen (RMS) por ventana. RMS y no pico: un chasquido suelto no debería
  // contar como que ahí ya se está hablando.
  const niveles: number[] = [];
  for (let i = 0; i < muestras.length; i += ventana) {
    const hasta = Math.min(i + ventana, muestras.length);
    let suma = 0;
    for (let j = i; j < hasta; j++) suma += muestras[j] * muestras[j];
    niveles.push(Math.sqrt(suma / (hasta - i)));
  }

  const umbral = Math.max(...niveles) * UMBRAL_RELATIVO;
  if (umbral < PISO_SENAL) return muestras; // todo silencio: no hay qué recortar

  const primera = niveles.findIndex((n) => n >= umbral);
  if (primera === -1) return muestras;
  let ultima = niveles.length - 1;
  while (ultima > primera && niveles[ultima] < umbral) ultima--;

  const margen = Math.round((tasa * MARGEN_MS) / 1000);
  const desde = Math.max(0, primera * ventana - margen);
  const hasta = Math.min(muestras.length, (ultima + 1) * ventana + margen);
  return desde === 0 && hasta === muestras.length ? muestras : muestras.slice(desde, hasta);
}

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

  // Recortar antes de normalizar: el umbral se mide sobre los niveles reales
  // de la grabación, y la ganancia se calcula ya sobre el tramo hablado.
  const limpio = normalizar(recortarSilencio(rendido.getChannelData(0), TASA_DESTINO));

  return new Blob([codificarWav(limpio, TASA_DESTINO)], { type: "audio/wav" });
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
