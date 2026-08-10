import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import { documento, entradasExportables } from "./docx";
import type { Captura } from "../db/db";

const noche = (fecha: string, texto: string, extra: Partial<Captura> = {}): Captura => ({
  id: Math.random(),
  tipo: "diario",
  fecha,
  creada: Date.now(),
  estado: "procesada",
  descripcion: texto,
  ...extra,
});

/** Un .docx es un zip; su texto vive en word/document.xml. */
async function textoDelDocx(entradas: Captura[]): Promise<string> {
  const buffer = await Packer.toBuffer(documento(entradas));
  // Los nombres y el contenido van sin comprimir lo suficiente como para
  // encontrarlos, pero para leerlo de verdad hace falta descomprimir.
  const { unzipSync, strFromU8 } = await import("fflate");
  const archivos = unzipSync(new Uint8Array(buffer));
  return strFromU8(archivos["word/document.xml"]);
}

describe("entradasExportables", () => {
  it("descarta las eliminadas y las que no tienen texto", () => {
    const r = entradasExportables([
      noche("2026-07-20", "una"),
      noche("2026-07-21", "otra", { estado: "eliminada" }),
      noche("2026-07-22", "", { descripcion: undefined, transcripcion: undefined }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].fecha).toBe("2026-07-20");
  });

  it("las ordena de la más vieja a la más nueva, como un diario", () => {
    const r = entradasExportables([
      noche("2026-07-25", "c"),
      noche("2026-07-20", "a"),
      noche("2026-07-23", "b"),
    ]);
    expect(r.map((e) => e.fecha)).toEqual(["2026-07-20", "2026-07-23", "2026-07-25"]);
  });

  it("usa la transcripción cuando la IA todavía no escribió la entrada", () => {
    const r = entradasExportables([
      noche("2026-07-20", "", { descripcion: undefined, transcripcion: "lo que dije" }),
    ]);
    expect(r).toHaveLength(1);
  });
});

describe("documento", () => {
  it("genera un .docx con el texto y la fecha de cada noche", async () => {
    const xml = await textoDelDocx([
      noche("2026-07-25", "Me desperté tarde otra vez, como a las diez."),
      noche("2026-07-26", "Hoy sí leí, casi cuarenta minutos."),
    ]);
    expect(xml).toContain("Me desperté tarde otra vez");
    expect(xml).toContain("Hoy sí leí");
    expect(xml).toContain("Sábado 25 de julio");
    expect(xml).toContain("Domingo 26 de julio");
  });

  it("pone el rango de fechas y cuántas noches hay", async () => {
    const xml = await textoDelDocx([noche("2026-07-20", "a"), noche("2026-07-26", "b")]);
    expect(xml).toContain("2 noches");
    expect(xml).toContain("Del Lunes 20 de julio al Domingo 26 de julio");
  });

  it("con una sola noche no dice «del … al …»", async () => {
    const xml = await textoDelDocx([noche("2026-07-26", "sola")]);
    expect(xml).toContain("1 noche");
    expect(xml).not.toContain("Del ");
  });

  it("separa los párrafos del texto en vez de pegarlos", async () => {
    const xml = await textoDelDocx([noche("2026-07-26", "Primero esto.\n\nY luego lo otro.")]);
    expect(xml).toContain("Primero esto.");
    expect(xml).toContain("Y luego lo otro.");
    // Dos párrafos: el texto no puede aparecer junto en un solo run.
    expect(xml).not.toContain("Primero esto.Y luego lo otro.");
  });
});
