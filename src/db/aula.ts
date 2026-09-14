import { db, type ComponenteNotaUPC, type Curso, type ItemAulaUPC } from "./db";
import { crearTarea } from "./capturas";
import { guardarAjuste, leerAjuste } from "../ia/ajustes";
import { aISO, desdeISO, sumarDias, type DiaISO } from "../lib/fecha";
import { msRegistrados } from "../lib/tiempo";

export const CLAVE_AULA_REVISION = "aulaUpcRevision";
export const CLAVE_AULA_ULTIMA = "aulaUpcUltima";
export const CLAVE_AULA_ESTADO = "aulaUpcEstado";

export interface FuenteAula {
  estado: "ok" | "sin_configurar" | "sin_sesion" | "error";
  verificada?: string;
  mensaje?: string;
}

export interface FeedAulaUPC {
  revision: number;
  completo?: boolean;
  fuentes: { calendario: FuenteAula; aula: FuenteAula };
  items: Array<Omit<ItemAulaUPC, "cursoId" | "leido" | "convertidoTareaId">>;
  componentes: Array<Omit<ComponenteNotaUPC, "cursoId">>;
}

const normalizar = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fechaDe = (valor?: string): DiaISO | undefined => /^\d{4}-\d{2}-\d{2}/.test(valor ?? "") ? valor!.slice(0, 10) : undefined;

function resolverCurso(cursos: Curso[], clave?: string, titulo?: string): number | undefined {
  const candidato = normalizar(`${clave ?? ""} ${titulo ?? ""}`);
  const encontrado = cursos.find((curso) => {
    const nombre = normalizar(curso.nombre);
    const codigo = normalizar(curso.codigo);
    return (codigo && candidato.includes(codigo)) || (nombre.length > 5 && candidato.includes(nombre));
  });
  return encontrado?.id;
}

/** Guarda el feed como una copia local. Repetir la misma revisión no altera tus decisiones. */
export async function importarFeedAula(feed: FeedAulaUPC): Promise<void> {
  const cursos = await db.cursos.where("activo").equals(1).toArray();
  await db.transaction("rw", db.aulaItems, db.componentesNotaUPC, async () => {
    for (const remoto of feed.items) {
      const previo = await db.aulaItems.get(remoto.id);
      const item: ItemAulaUPC = {
        ...remoto,
        vence: fechaDe(remoto.vence),
        cursoId: previo?.cursoId ?? resolverCurso(cursos, remoto.cursoClave, remoto.titulo),
        leido: previo?.leido ?? (remoto.novedad ? 0 : 1),
        oculto: previo?.oculto ?? 0,
        convertidoTareaId: previo?.convertidoTareaId,
      };
      await db.aulaItems.put(item);
    }
    for (const remoto of feed.componentes) {
      await db.componentesNotaUPC.put({
        ...remoto,
        cursoId: resolverCurso(cursos, remoto.cursoClave, remoto.nombre),
      });
    }
  });
  await Promise.all([
    guardarAjuste(CLAVE_AULA_REVISION, String(feed.revision)),
    guardarAjuste(CLAVE_AULA_ULTIMA, new Date().toISOString()),
    guardarAjuste(CLAVE_AULA_ESTADO, JSON.stringify(feed.fuentes)),
  ]);
}

export async function estadoAula(): Promise<{ revision: string; ultima?: string; fuentes?: FeedAulaUPC["fuentes"] }> {
  const [revision, ultima, crudo] = await Promise.all([
    leerAjuste(CLAVE_AULA_REVISION), leerAjuste(CLAVE_AULA_ULTIMA), leerAjuste(CLAVE_AULA_ESTADO),
  ]);
  try {
    return { revision: revision ?? "0", ultima, fuentes: crudo ? JSON.parse(crudo) : undefined };
  } catch {
    return { revision: revision ?? "0", ultima };
  }
}

export async function marcarLeidoAula(id: string): Promise<void> {
  await db.aulaItems.update(id, { leido: 1, novedad: 0 });
}

/** Oculta solo en este dispositivo; una actualización UPC nunca revierte esa decisión. */
export async function ocultarAula(id: string): Promise<void> {
  await db.aulaItems.update(id, { oculto: 1, leido: 1, novedad: 0 });
}

/** La asociación la decide el usuario si UPC no trajo una pista suficiente. */
export async function vincularAulaACurso(id: string, cursoId: number): Promise<void> {
  await db.aulaItems.update(id, { cursoId });
}

export async function convertirAulaEnTarea(item: ItemAulaUPC): Promise<number | undefined> {
  if (item.convertidoTareaId) return item.convertidoTareaId;
  const tarea = await crearTarea({
    texto: item.titulo,
    descripcion: item.descripcion,
    vence: item.vence,
  });
  await db.aulaItems.update(item.id, { convertidoTareaId: tarea, leido: 1, novedad: 0 });
  return tarea;
}

export async function itemsAulaActivos(): Promise<ItemAulaUPC[]> {
  const items = await db.aulaItems.where("estado").equals("activo").toArray();
  // UPC conserva las entregas históricas en el feed. Una entrega ya enviada no
  // necesita competir con lo que aún requiere atención; sigue en la copia
  // local y puede volver a entrar si UPC deja de marcarla como entregada.
  const entregada = (item: ItemAulaUPC) => /\b(entregad[oa]s?|turn[ -]?ed[ -]?in|submitted|entrega[ -]?realizada)\b/i.test(`${item.titulo} ${item.descripcion ?? ""}`);
  return items.filter((item) => !item.oculto && !entregada(item))
    .sort((a, b) => (a.vence ?? "9999").localeCompare(b.vence ?? "9999") || b.actualizado.localeCompare(a.actualizado));
}

export interface AnalisisCursoAula {
  objetivo: number;
  pesoEvaluado: number;
  puntosAcumulados: number;
  promedioRendido?: number;
  notaNecesaria?: number;
  minutos7: number;
  minutos28: number;
  proximo?: ItemAulaUPC;
}

/** Hechos y cálculo transparente: nunca deduce calidad de estudio ni promete una nota. */
export async function analisisCursoAula(curso: Curso, ahora = Date.now()): Promise<AnalisisCursoAula> {
  const [componentes, actividades, items] = await Promise.all([
    db.componentesNotaUPC.where("cursoId").equals(curso.id!).toArray(),
    db.actividades.where("cursoId").equals(curso.id!).toArray(),
    db.aulaItems.where("cursoId").equals(curso.id!).toArray(),
  ]);
  let pesoEvaluado = 0;
  let puntosAcumulados = 0;
  for (const componente of componentes) {
    if (componente.peso === undefined || componente.nota === undefined) continue;
    pesoEvaluado += componente.peso;
    puntosAcumulados += componente.peso * componente.nota / 100;
  }
  const objetivo = curso.notaObjetivo ?? 13;
  const pesoRestante = 100 - pesoEvaluado;
  const promedioRendido = pesoEvaluado > 0 ? puntosAcumulados * 100 / pesoEvaluado : undefined;
  const notaNecesaria = pesoRestante > 0 && pesoEvaluado > 0
    ? (objetivo - puntosAcumulados) * 100 / pesoRestante : undefined;
  const desde28 = aISO(sumarDias(new Date(ahora), -27));
  const sesiones = actividades.length
    ? await db.sesiones.where("dia").aboveOrEqual(desde28).toArray()
    : [];
  const ids = new Set(actividades.map((actividad) => actividad.id));
  const corte7 = aISO(sumarDias(new Date(ahora), -6));
  let minutos7 = 0;
  let minutos28 = 0;
  for (const sesion of sesiones) {
    if (!ids.has(sesion.actividadId)) continue;
    const minutos = Math.round(msRegistrados(sesion, ahora) / 60_000);
    minutos28 += minutos;
    if (sesion.dia >= corte7) minutos7 += minutos;
  }
  const proximo = items.filter((item) => item.estado === "activo" && !item.oculto && item.vence && item.vence >= aISO(new Date(ahora)))
    .sort((a, b) => (a.vence ?? "").localeCompare(b.vence ?? ""))[0];
  return { objetivo, pesoEvaluado, puntosAcumulados, promedioRendido, notaNecesaria, minutos7, minutos28, proximo };
}

export function diasHasta(iso?: DiaISO, ahora = new Date()): number | undefined {
  return iso ? Math.round((desdeISO(iso).getTime() - desdeISO(aISO(ahora)).getTime()) / 86_400_000) : undefined;
}
