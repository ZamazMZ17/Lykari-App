import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import type { Captura } from "../db/db";
import { desdeISO, fechaLarga, type DiaISO } from "../lib/fecha";
import { esNativo } from "../lib/plataforma";

/**
 * El `.docx` se genera bajo demanda y no se guarda: no se mantiene un Word
 * vivo (CLAUDE.md §5). El diario de verdad vive en el teléfono; esto es una
 * copia para llevársela a otro lado.
 */

const SERIF = "Georgia";

function parrafos(texto: string): Paragraph[] {
  return texto
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        new Paragraph({
          children: [new TextRun({ text: p, font: SERIF, size: 24 })],
          spacing: { after: 180, line: 340 },
        }),
    );
}

export function documento(entradas: Captura[]): Document {
  const hijos: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: "Diario", font: SERIF, size: 48, bold: true })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: rangoDeFechas(entradas),
          font: SERIF,
          size: 20,
          color: "5D6656",
        }),
      ],
      spacing: { after: 480 },
    }),
  ];

  for (const e of entradas) {
    hijos.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: fechaLarga(desdeISO(e.fecha)), font: SERIF, size: 26, bold: true }),
        ],
        spacing: { before: 320, after: 140 },
      }),
    );
    // Lo escrito en primera persona; si no pasó por la IA, lo que se transcribió.
    hijos.push(...parrafos(e.descripcion ?? e.transcripcion ?? "(sin texto)"));
  }

  hijos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Exportado desde Lykari",
          font: SERIF,
          size: 18,
          color: "8A928A",
        }),
      ],
      spacing: { before: 640 },
    }),
  );

  return new Document({ sections: [{ children: hijos }] });
}

function rangoDeFechas(entradas: Captura[]): string {
  if (entradas.length === 0) return "";
  const dias = entradas.map((e) => e.fecha).sort();
  const desde = fechaLarga(desdeISO(dias[0]));
  const hasta = fechaLarga(desdeISO(dias[dias.length - 1]));
  const noches = `${entradas.length} ${entradas.length === 1 ? "noche" : "noches"}`;
  return desde === hasta ? `${desde} · ${noches}` : `Del ${desde} al ${hasta} · ${noches}`;
}

const nombreArchivo = (entradas: Captura[]) => {
  const dias = entradas.map((e) => e.fecha).sort();
  const ultimo: DiaISO = dias[dias.length - 1] ?? "";
  return `diario-lykari-${ultimo}.docx`;
};

async function aBase64(blob: Blob): Promise<string> {
  const texto = await new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
  return texto.slice(texto.indexOf(",") + 1);
}

/**
 * Genera el archivo y lo entrega. En el APK lo escribe y abre el menú de
 * compartir de Android; en el navegador lo descarga.
 */
export function entradasExportables(entradas: Captura[]): Captura[] {
  return entradas
    .filter((e) => e.estado !== "eliminada" && (e.descripcion || e.transcripcion))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function exportarDiario(entradas: Captura[]): Promise<string> {
  const conTexto = entradasExportables(entradas);

  if (conTexto.length === 0) throw new Error("Todavía no hay ninguna noche escrita.");

  const blob = await Packer.toBlob(documento(conTexto));
  const nombre = nombreArchivo(conTexto);

  if (!esNativo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    return nombre;
  }

  // Cache y no Documents: el archivo es desechable, se regenera cuando haga falta.
  const { uri } = await Filesystem.writeFile({
    path: nombre,
    data: await aBase64(blob),
    directory: Directory.Cache,
  });
  await Share.share({ title: "Diario", url: uri, dialogTitle: "Guardar o enviar el diario" });
  return nombre;
}
