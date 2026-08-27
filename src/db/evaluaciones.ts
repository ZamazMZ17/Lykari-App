import { db, type Evaluacion } from "./db";
import type { DiaISO } from "../lib/fecha";

export interface NuevaEvaluacion {
  nombre: string;
  peso: number;
  semana?: number;
  fecha?: DiaISO;
  recuperable: boolean;
}

export async function agregarEvaluacion(
  cursoId: number,
  datos: NuevaEvaluacion,
): Promise<number> {
  return db.evaluaciones.add({
    cursoId,
    ...datos,
    nombre: datos.nombre.trim(),
    hecha: 0,
    creada: Date.now(),
  });
}

export async function actualizarEvaluacion(id: number, datos: NuevaEvaluacion): Promise<void> {
  await db.evaluaciones.update(id, { ...datos, nombre: datos.nombre.trim() });
}

/** No es historial de tiempo como una sesión: quitarla la borra de verdad. */
export async function eliminarEvaluacion(id: number): Promise<void> {
  await db.evaluaciones.delete(id);
}

/** `undefined` borra la nota puesta y la vuelve a marcar como no rendida. */
export async function ponerNota(id: number, nota: number | undefined): Promise<void> {
  await db.evaluaciones.update(id, { nota, hecha: nota !== undefined ? 1 : 0 });
}

export async function evaluacionesDeCurso(cursoId: number): Promise<Evaluacion[]> {
  const filas = await db.evaluaciones.where("cursoId").equals(cursoId).toArray();
  return filas.sort((a, b) => a.creada - b.creada);
}

export interface ResumenNotas {
  /** % del curso ya rendido (suma de pesos con nota puesta). */
  pesoEvaluado: number;
  /** Puntos ya asegurados sobre 20, contando lo pendiente como si valiera 0. */
  puntosAcumulados: number;
  /** Promedio ponderado de solo lo ya rendido, sin mirar lo pendiente. */
  promedioRendido: number;
}

/** Nunca proyecta la nota final: solo suma lo que ya hay, con lo que falta a la vista. */
export function resumenNotas(evaluaciones: Evaluacion[]): ResumenNotas {
  let pesoEvaluado = 0;
  let suma = 0;
  for (const e of evaluaciones) {
    if (!e.hecha || e.nota === undefined) continue;
    pesoEvaluado += e.peso;
    suma += (e.peso * e.nota) / 100;
  }
  return {
    pesoEvaluado,
    puntosAcumulados: suma,
    promedioRendido: pesoEvaluado > 0 ? (suma / pesoEvaluado) * 100 : 0,
  };
}

/**
 * Todas las que ya tienen fecha puesta. Un ciclo entero son unas pocas
 * decenas de evaluaciones como mucho, así que se traen todas y quien las usa
 * filtra por día — igual que `cursosActivos` con `bloquesDelDia`.
 */
export async function todasConFecha(): Promise<Evaluacion[]> {
  return db.evaluaciones.orderBy("fecha").toArray();
}

export function evaluacionesDelDia(evaluaciones: Evaluacion[], dia: DiaISO): Evaluacion[] {
  return evaluaciones.filter((e) => e.fecha === dia);
}

/** La más próxima sin rendir todavía, para el aviso de "próxima entrega". */
export async function proximaEvaluacion(hoy: DiaISO): Promise<(Evaluacion & { cursoNombre: string }) | null> {
  const futuras = await db.evaluaciones
    .where("fecha")
    .aboveOrEqual(hoy)
    .toArray();
  const pendientes = futuras.filter((e) => !e.hecha).sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
  const primera = pendientes[0];
  if (!primera) return null;
  const curso = await db.cursos.get(primera.cursoId);
  if (!curso || !curso.activo) return null;
  return { ...primera, cursoNombre: curso.nombre };
}
