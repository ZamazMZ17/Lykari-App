import { describe, expect, it } from "vitest";
import { base64ABlob, blobABase64, leerRespaldo } from "./respaldo";

const valido = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    formato: "lykari-respaldo",
    version: 1,
    exportado: "2026-07-29T10:00:00.000Z",
    tablas: {
      actividades: [{ id: 1 }, { id: 2 }],
      sesiones: [{ id: 1 }],
      capturas: [],
      tareas: [{ id: 1 }, { id: 2 }, { id: 3 }],
      cierres: [],
      racha: [],
    },
    ...extra,
  });

describe("leerRespaldo — la puerta de entrada de una copia", () => {
  it("acepta una copia válida y cuenta cada tabla", () => {
    const { resumen } = leerRespaldo(valido());
    expect(resumen.actividades).toBe(2);
    expect(resumen.sesiones).toBe(1);
    expect(resumen.tareas).toBe(3);
    expect(resumen.capturas).toBe(0);
    expect(resumen.exportado).toBe("2026-07-29T10:00:00.000Z");
  });

  it("rechaza algo que no es JSON", () => {
    expect(() => leerRespaldo("esto no es json {")).toThrow(/no es una copia válida/i);
  });

  it("rechaza un JSON que no es una copia de Lykari", () => {
    expect(() => leerRespaldo(JSON.stringify({ cualquier: "cosa" }))).toThrow(/no parece/i);
  });

  it("rechaza una copia sin la marca de formato", () => {
    const sinFormato = JSON.stringify({ version: 1, tablas: {} });
    expect(() => leerRespaldo(sinFormato)).toThrow(/no parece/i);
  });

  it("rechaza una copia de una versión más nueva que la app", () => {
    expect(() => leerRespaldo(valido({ version: 99 }))).toThrow(/versión más nueva/i);
  });

  it("no se cae si a una tabla le falta el arreglo", () => {
    const raro = JSON.stringify({
      formato: "lykari-respaldo",
      version: 1,
      exportado: "2026-07-29T10:00:00.000Z",
      tablas: { actividades: [{ id: 1 }] },
    });
    const { resumen } = leerRespaldo(raro);
    expect(resumen.actividades).toBe(1);
    expect(resumen.sesiones).toBe(0);
    expect(resumen.cierres).toBe(0);
  });
});

describe("el audio sobrevive al viaje a base64 y de vuelta", () => {
  it("los bytes vuelven idénticos y con su tipo", async () => {
    // Bytes con valores altos y cero, que es donde un mal manejo se rompe.
    const original = new Uint8Array([0, 1, 127, 128, 200, 255, 42, 0]);
    const blob = new Blob([original], { type: "audio/webm" });

    const b64 = await blobABase64(blob);
    const vuelta = base64ABlob(b64, "audio/webm");

    expect(vuelta.type).toBe("audio/webm");
    const recuperado = new Uint8Array(await vuelta.arrayBuffer());
    expect([...recuperado]).toEqual([...original]);
  });

  it("un audio vacío no rompe la codificación", async () => {
    const vuelta = base64ABlob(await blobABase64(new Blob([], { type: "audio/webm" })), "audio/webm");
    expect(vuelta.size).toBe(0);
  });
});
