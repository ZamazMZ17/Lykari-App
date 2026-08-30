import { describe, expect, it } from "vitest";
import { codificarWav, normalizar, recortarSilencio } from "./audio";

/** Un tono, para tener algo que suene de verdad en vez de ruido al azar. */
const tono = (n: number, amplitud: number) =>
  Float32Array.from({ length: n }, (_, i) => Math.sin((i / 8) * Math.PI) * amplitud);

const pico = (m: Float32Array) => Math.max(...Array.from(m, Math.abs));

const leerTexto = (v: DataView, pos: number, largo: number) =>
  Array.from({ length: largo }, (_, i) => String.fromCharCode(v.getUint8(pos + i))).join("");

describe("codificarWav", () => {
  it("escribe una cabecera RIFF/WAVE válida", () => {
    const v = new DataView(codificarWav(new Float32Array(100), 16_000));
    expect(leerTexto(v, 0, 4)).toBe("RIFF");
    expect(leerTexto(v, 8, 4)).toBe("WAVE");
    expect(leerTexto(v, 12, 4)).toBe("fmt ");
    expect(leerTexto(v, 36, 4)).toBe("data");
  });

  it("declara mono, PCM de 16 bits y la tasa que se le pasa", () => {
    const v = new DataView(codificarWav(new Float32Array(10), 16_000));
    expect(v.getUint16(20, true)).toBe(1); // PCM
    expect(v.getUint16(22, true)).toBe(1); // un canal
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint32(28, true)).toBe(32_000); // bytes por segundo
    expect(v.getUint16(32, true)).toBe(2);
    expect(v.getUint16(34, true)).toBe(16);
  });

  it("el tamaño total es 44 bytes de cabecera más dos por muestra", () => {
    const buffer = codificarWav(new Float32Array(500), 16_000);
    expect(buffer.byteLength).toBe(44 + 1000);
    expect(new DataView(buffer).getUint32(4, true)).toBe(36 + 1000);
    expect(new DataView(buffer).getUint32(40, true)).toBe(1000);
  });

  it("convierte las muestras a enteros con signo", () => {
    const v = new DataView(codificarWav(new Float32Array([0, 1, -1, 0.5]), 16_000));
    expect(v.getInt16(44, true)).toBe(0);
    expect(v.getInt16(46, true)).toBe(32767);
    expect(v.getInt16(48, true)).toBe(-32768);
    expect(v.getInt16(50, true)).toBe(16383);
  });

  it("recorta lo que se sale del rango en vez de dar la vuelta", () => {
    // Sin el recorte, un pico por encima de 1 sonaría como un chasquido.
    const v = new DataView(codificarWav(new Float32Array([4, -4]), 16_000));
    expect(v.getInt16(44, true)).toBe(32767);
    expect(v.getInt16(46, true)).toBe(-32768);
  });

  it("acepta audio vacío sin romperse", () => {
    expect(codificarWav(new Float32Array(0), 16_000).byteLength).toBe(44);
  });
});

describe("normalizar", () => {
  it("sube una grabación baja hasta el pico de destino", () => {
    expect(pico(normalizar(tono(400, 0.2)))).toBeCloseTo(0.95, 2);
  });

  it("baja una grabación pasada de volumen en vez de dejarla recortando", () => {
    const salida = normalizar(tono(400, 1));
    expect(pico(salida)).toBeCloseTo(0.95, 2);
    expect(pico(salida)).toBeLessThan(1);
  });

  it("no amplifica sin límite: una grabación casi muda no se vuelve siseo", () => {
    // Sin el tope, un pico de 0.001 se multiplicaría por 950.
    expect(pico(normalizar(tono(400, 0.001)))).toBeCloseTo(0.008, 3);
  });

  it("deja el silencio absoluto como está", () => {
    const mudo = new Float32Array(200);
    expect(normalizar(mudo)).toBe(mudo);
  });

  it("no toca lo que ya está en su sitio", () => {
    const ok = tono(400, 0.95);
    expect(normalizar(ok)).toBe(ok);
  });
});

describe("recortarSilencio", () => {
  it("quita el aire muerto del principio y del final", () => {
    // 1 s de silencio · 1 s de voz · 1 s de silencio, a 16 kHz.
    const m = new Float32Array(48_000);
    m.set(tono(16_000, 0.5), 16_000);

    const salida = recortarSilencio(m, 16_000);
    expect(salida.length).toBeLessThan(m.length);
    // Queda la voz más el margen de 150 ms a cada lado.
    expect(salida.length).toBeGreaterThanOrEqual(16_000);
    expect(salida.length).toBeLessThan(16_000 + 2 * 0.15 * 16_000 + 640);
  });

  it("deja margen antes de la voz, para no comerse la primera palabra", () => {
    const m = new Float32Array(32_000);
    m.set(tono(16_000, 0.5), 16_000);
    // El primer bloque del resultado tiene que seguir siendo silencio.
    expect(pico(recortarSilencio(m, 16_000).slice(0, 1000))).toBe(0);
  });

  it("no recorta cuando se habla de punta a punta", () => {
    const m = tono(16_000, 0.5);
    expect(recortarSilencio(m, 16_000)).toBe(m);
  });

  it("con todo en silencio devuelve el audio tal cual, sin dejarlo en nada", () => {
    const mudo = new Float32Array(16_000);
    expect(recortarSilencio(mudo, 16_000)).toBe(mudo);
  });

  it("una grabación entera en voz baja no se borra: el umbral es relativo", () => {
    const m = new Float32Array(32_000);
    m.set(tono(16_000, 0.02), 8_000);
    const salida = recortarSilencio(m, 16_000);
    expect(salida.length).toBeGreaterThanOrEqual(16_000);
  });
});
