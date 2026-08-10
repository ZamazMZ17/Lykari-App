import { describe, expect, it } from "vitest";
import { codificarWav } from "./audio";

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
