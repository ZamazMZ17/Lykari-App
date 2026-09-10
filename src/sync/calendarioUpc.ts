import { CapacitorHttp } from "@capacitor/core";
import { db, type Curso, type ItemAulaUPC, type TipoAulaUPC } from "../db/db";
import { guardarAjuste, leerAjuste } from "../ia/ajustes";
import { type DiaISO } from "../lib/fecha";
import { esNativo } from "../lib/plataforma";
import { CLAVE_AULA_ESTADO, CLAVE_AULA_ULTIMA, estadoAula, type FuenteAula } from "../db/aula";

export const CLAVE_CALENDARIO_UPC_URL = "upcCalendarUrl";

type ItemCalendario = Omit<ItemAulaUPC, "cursoId" | "leido" | "oculto" | "convertidoTareaId">;

const normalizar = (texto = "") =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const desescapar = (texto = "") =>
  texto.replace(/\\\\n/gi, "\n").replace(/\\\\,/g, ",").replace(/\\\\;/g, ";").replace(/\\\\\\\\/g, "\\");

function fechaIcs(valor?: string): DiaISO | undefined {
  const partes = valor?.match(/^(\d{4})(\d{2})(\d{2})/);
  return partes ? `${partes[1]}-${partes[2]}-${partes[3]}` : undefined;
}

function tipoDe(titulo: string, descripcion: string): TipoAulaUPC {
  const texto = normalizar(`${titulo} ${descripcion}`);
  if (/examen|ef\b|ep\b|parcial|final/.test(texto)) return "examen";
  if (/control|pc\d|practica calificada/.test(texto)) return "control";
  if (/evaluacion|evaluacion|gnp|eaaa/.test(texto)) return "evaluacion";
  if (/anuncio|novedad|comunicado/.test(texto)) return "anuncio";
  return "entrega";
}

/** Las clases semanales no son entregables y no deben llenar el Aula. */
function esRelevante(titulo: string, descripcion: string): boolean {
  const texto = normalizar(`${titulo} ${descripcion}`);
  return !/\bclase\b|\bsesion\b|horario regular/.test(texto);
}

function leerEventosIcs(texto: string): ItemCalendario[] {
  const lineas = texto.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const eventos: Array<Record<string, string>> = [];
  let actual: Record<string, string> | undefined;

  for (const linea of lineas) {
    if (linea === "BEGIN:VEVENT") {
      actual = {};
      continue;
    }
    if (linea === "END:VEVENT") {
      if (actual) eventos.push(actual);
      actual = undefined;
      continue;
    }
    if (!actual) continue;
    const separador = linea.indexOf(":");
    if (separador < 1) continue;
    const clave = linea.slice(0, separador).split(";")[0].toUpperCase();
    actual[clave] = desescapar(linea.slice(separador + 1));
  }

  return eventos
    .filter((evento) => evento.STATUS !== "CANCELLED")
    .map((evento): ItemCalendario | undefined => {
      const titulo = evento.SUMMARY?.trim();
      const descripcion = evento.DESCRIPTION?.trim();
      const vence = fechaIcs(evento.DTSTART) ?? fechaIcs(evento.DUE) ?? fechaIcs(evento.DTEND);
      if (!titulo || !vence || !esRelevante(titulo, descripcion ?? "")) return undefined;
      const uid = evento.UID?.trim() || `${titulo}:${vence}`;
      return {
        id: `ics:${uid}`,
        cursoClave: titulo,
        tipo: tipoDe(titulo, descripcion ?? ""),
        titulo,
        descripcion,
        publicado: fechaIcs(evento.CREATED) ?? fechaIcs(evento.DTSTAMP),
        vence,
        actualizado: evento["LAST-MODIFIED"] ?? evento.DTSTAMP ?? new Date().toISOString(),
        estado: "activo",
        novedad: 1,
      };
    })
    .filter((evento): evento is ItemCalendario => !!evento);
}

function resolverCurso(cursos: Curso[], titulo: string): number | undefined {
  const candidato = normalizar(titulo);
  return cursos.find((curso) => {
    const nombre = normalizar(curso.nombre);
    const codigo = normalizar(curso.codigo);
    return (codigo && candidato.includes(codigo)) || (nombre.length > 5 && candidato.includes(nombre));
  })?.id;
}

async function guardarFuenteCalendario(fuente: FuenteAula, actualizarFecha = false): Promise<void> {
  const previo = await estadoAula();
  await Promise.all([
    guardarAjuste(CLAVE_AULA_ESTADO, JSON.stringify({
      calendario: fuente,
      aula: previo.fuentes?.aula ?? { estado: "sin_configurar" },
    })),
    ...(actualizarFecha ? [guardarAjuste(CLAVE_AULA_ULTIMA, new Date().toISOString())] : []),
  ]);
}

async function importarCalendario(items: ItemCalendario[]): Promise<void> {
  const cursos = await db.cursos.where("activo").equals(1).toArray();
  await db.transaction("rw", db.aulaItems, async () => {
    const anteriores = await db.aulaItems.filter((item) => item.id.startsWith("ics:")).toArray();
    for (const item of anteriores) await db.aulaItems.update(item.id, { estado: "retirado" });

    for (const remoto of items) {
      const previo = await db.aulaItems.get(remoto.id);
      await db.aulaItems.put({
        ...remoto,
        cursoId: previo?.cursoId ?? resolverCurso(cursos, remoto.titulo),
        leido: previo?.leido ?? 0,
        oculto: previo?.oculto ?? 0,
        convertidoTareaId: previo?.convertidoTareaId,
      });
    }
  });
  await guardarFuenteCalendario({ estado: "ok", verificada: new Date().toISOString() }, true);
}

async function descargarIcs(url: string): Promise<string> {
  if (esNativo) {
    const respuesta = await CapacitorHttp.get({
      url,
      headers: { Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.8" },
      connectTimeout: 15_000,
      readTimeout: 20_000,
    });
    if (respuesta.status < 200 || respuesta.status >= 300) throw new Error(`UPC respondió con ${respuesta.status}.`);
    return typeof respuesta.data === "string" ? respuesta.data : String(respuesta.data ?? "");
  }

  const respuesta = await fetch(url, { headers: { Accept: "text/calendar" } });
  if (!respuesta.ok) throw new Error(`UPC respondió con ${respuesta.status}.`);
  return respuesta.text();
}

export async function leerUrlCalendarioUPC(): Promise<string> {
  return (await leerAjuste(CLAVE_CALENDARIO_UPC_URL)) ?? "";
}

export async function guardarUrlCalendarioUPC(url: string): Promise<void> {
  const limpia = url.trim();
  if (limpia && !/^https:\/\//i.test(limpia)) throw new Error("El enlace del calendario debe empezar con https://.");
  await guardarAjuste(CLAVE_CALENDARIO_UPC_URL, limpia);
  if (!limpia) await guardarFuenteCalendario({ estado: "sin_configurar" });
}

/**
 * Consulta directamente el enlace privado de la UPC desde el teléfono.
 * En el APK se usa HTTP nativo para evitar las restricciones CORS del WebView.
 */
export async function sincronizarCalendarioUPC(): Promise<{ eventos: number }> {
  const url = await leerUrlCalendarioUPC();
  if (!url) {
    await guardarFuenteCalendario({ estado: "sin_configurar" });
    throw new Error("Pega primero el enlace .ics de tu calendario UPC.");
  }

  try {
    const texto = await descargarIcs(url);
    const items = leerEventosIcs(texto);
    await importarCalendario(items);
    return { eventos: items.length };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo leer el calendario UPC.";
    await guardarFuenteCalendario({ estado: "error", mensaje });
    if (!esNativo && /fetch|network|cors/i.test(mensaje)) {
      throw new Error("El navegador bloqueó el calendario por CORS. Usa el APK para sincronizarlo directamente.");
    }
    throw error;
  }
}
