import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { db } from "../db/db";
import { hoyISO } from "../lib/fecha";
import { esNativo } from "../lib/plataforma";

/**
 * Copia de seguridad para llevar el registro de un dispositivo a otro. Es la
 * forma de «sincronizar» que respeta el diseño local-first (§3): no hay
 * servidor, el archivo lo mueve el usuario por donde quiera.
 *
 * **No se exportan los ajustes** (la API key, el tema, la posición de la
 * mascota): son de cada dispositivo, y meter la key en un archivo que se manda
 * por WhatsApp la dejaría expuesta. Lo que viaja es el registro en sí.
 */

const FORMATO = "lykari-respaldo";
const VERSION = 1;
const TABLAS = ["actividades", "sesiones", "capturas", "tareas", "cierres", "racha"] as const;
type Tabla = (typeof TABLAS)[number];

/** Marca con la que se reconoce un Blob (audio) dentro del JSON. */
const MARCA_BLOB = "__blob__";

interface BlobCodificado {
  [MARCA_BLOB]: string;
  tipo: string;
}

export interface Respaldo {
  formato: string;
  version: number;
  exportado: string;
  tablas: Record<Tabla, unknown[]>;
}

export interface ResumenRespaldo {
  exportado: string;
  actividades: number;
  sesiones: number;
  capturas: number;
  tareas: number;
  cierres: number;
}

/* ── blobs ↔ base64 ──────────────────────────────────────────────── */

export async function blobABase64(blob: Blob): Promise<string> {
  // `arrayBuffer` + `btoa` en vez de FileReader: funciona igual en el navegador
  // y en Node (para poder probarlo), y no depende de una API del DOM. El troceo
  // evita reventar la pila al pasar el audio entero a fromCharCode.
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = "";
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario);
}

export function base64ABlob(b64: string, tipo: string): Blob {
  const binario = atob(b64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

async function codificar(registro: Record<string, unknown>): Promise<Record<string, unknown>> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(registro)) {
    salida[k] =
      v instanceof Blob ? ({ [MARCA_BLOB]: await blobABase64(v), tipo: v.type } as BlobCodificado) : v;
  }
  return salida;
}

function decodificar(registro: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(registro)) {
    if (v && typeof v === "object" && MARCA_BLOB in (v as object)) {
      const b = v as BlobCodificado;
      salida[k] = base64ABlob(b[MARCA_BLOB], b.tipo);
    } else {
      salida[k] = v;
    }
  }
  return salida;
}

/* ── exportar ────────────────────────────────────────────────────── */

async function construirRespaldo(): Promise<Respaldo> {
  const tablas = {} as Record<Tabla, unknown[]>;
  for (const t of TABLAS) {
    const filas = (await db.table(t).toArray()) as Record<string, unknown>[];
    tablas[t] = await Promise.all(filas.map(codificar));
  }
  return { formato: FORMATO, version: VERSION, exportado: new Date().toISOString(), tablas };
}

export async function exportarRespaldo(): Promise<string> {
  const respaldo = await construirRespaldo();
  const json = JSON.stringify(respaldo);
  const nombre = `lykari-respaldo-${hoyISO()}.json`;

  if (!esNativo) {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    return nombre;
  }

  const { uri } = await Filesystem.writeFile({
    path: nombre,
    data: json,
    directory: Directory.Cache,
    encoding: "utf8" as never,
  });
  await Share.share({ title: "Copia de Lykari", url: uri, dialogTitle: "Guardar o enviar la copia" });
  return nombre;
}

/* ── importar ────────────────────────────────────────────────────── */

/** Valida el archivo y devuelve un resumen, sin tocar todavía la base. */
export function leerRespaldo(texto: string): { respaldo: Respaldo; resumen: ResumenRespaldo } {
  let datos: Respaldo;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no es una copia válida.");
  }
  if (datos?.formato !== FORMATO || !datos.tablas) {
    throw new Error("Esto no parece una copia de Lykari.");
  }
  if (datos.version > VERSION) {
    throw new Error("La copia es de una versión más nueva de la app. Actualízala primero.");
  }

  const cuenta = (t: Tabla) => (Array.isArray(datos.tablas[t]) ? datos.tablas[t].length : 0);
  return {
    respaldo: datos,
    resumen: {
      exportado: datos.exportado,
      actividades: cuenta("actividades"),
      sesiones: cuenta("sesiones"),
      capturas: cuenta("capturas"),
      tareas: cuenta("tareas"),
      cierres: cuenta("cierres"),
    },
  };
}

/**
 * Reemplaza el registro de este dispositivo con el de la copia. Es a propósito
 * un reemplazo y no una mezcla: mezclar dos registros editados por separado
 * abre conflictos que esta app no quiere resolver a escondidas. Los ajustes de
 * este dispositivo (key, tema) no se tocan.
 */
export async function restaurarRespaldo(respaldo: Respaldo): Promise<void> {
  await db.transaction("rw", TABLAS.map((t) => db.table(t)), async () => {
    for (const t of TABLAS) {
      await db.table(t).clear();
      const filas = (respaldo.tablas[t] ?? []) as Record<string, unknown>[];
      if (filas.length) await db.table(t).bulkAdd(filas.map(decodificar));
    }
  });
}

export function fechaLegible(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
