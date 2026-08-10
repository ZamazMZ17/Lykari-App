import {
  db,
  type Captura,
  type EstadoCaptura,
  type Tarea,
  type TipoCaptura,
} from "./db";
import { diaDe, hoyISO, type DiaISO } from "../lib/fecha";

/* ── capturas ────────────────────────────────────────────────────── */

/**
 * Guarda el audio antes de tocar la red. Es el orden que importa: lo que el
 * usuario dijo queda a salvo aunque no haya key, no haya internet o la IA
 * devuelva basura.
 */
export async function guardarAudio(
  tipo: TipoCaptura,
  audioBlob: Blob,
  duracionMs: number,
): Promise<number> {
  const creada = Date.now();
  return db.capturas.add({
    tipo,
    fecha: diaDe(creada),
    creada,
    audioBlob,
    duracionMs,
    estado: "nueva",
  });
}

/** Para cuando el usuario escribe en vez de hablar. */
export async function guardarTexto(tipo: TipoCaptura, texto: string): Promise<number> {
  const creada = Date.now();
  return db.capturas.add({
    tipo,
    fecha: diaDe(creada),
    creada,
    transcripcion: texto.trim(),
    estado: "nueva",
  });
}

export async function capturasDe(tipo: TipoCaptura): Promise<Captura[]> {
  const todas = await db.capturas.where("tipo").equals(tipo).toArray();
  return todas
    .filter((c) => c.estado !== "eliminada")
    .sort((a, b) => b.creada - a.creada);
}

export async function contarPorTipo(): Promise<Record<TipoCaptura, number>> {
  const todas = await db.capturas.toArray();
  const cuenta = { musica: 0, video: 0, negocio: 0, diario: 0, pendiente: 0 };
  for (const c of todas) {
    if (c.estado === "eliminada") continue;
    cuenta[c.tipo]++;
  }
  return cuenta;
}

/** Las que están esperando a la IA (sin key, sin red o con error). */
export async function capturasSinProcesar(): Promise<Captura[]> {
  const nuevas = await db.capturas.where("estado").equals("nueva").toArray();
  return nuevas.sort((a, b) => a.creada - b.creada);
}

export async function cambiarEstado(id: number, estado: EstadoCaptura): Promise<void> {
  // Al eliminar se suelta el audio: es lo que más pesa y ya no sirve de nada.
  const cambios: Partial<Captura> = { estado };
  if (estado === "eliminada") cambios.audioBlob = undefined;
  await db.capturas.update(id, cambios);
}

export async function hayDiarioHoy(dia: DiaISO = hoyISO()): Promise<boolean> {
  const delDia = await db.capturas.where("fecha").equals(dia).toArray();
  return delDia.some((c) => c.tipo === "diario" && c.estado !== "eliminada");
}

/* ── tareas ──────────────────────────────────────────────────────── */

export async function crearTarea(
  datos: Omit<Tarea, "id" | "creada" | "hecha"> & { hecha?: 0 | 1 },
): Promise<number> {
  return db.tareas.add({ ...datos, hecha: datos.hecha ?? 0, creada: Date.now() });
}

export async function tareas(): Promise<Tarea[]> {
  const todas = await db.tareas.toArray();
  // Pendientes primero, y dentro de cada grupo lo que vence antes.
  return todas.sort((a, b) => {
    if (a.hecha !== b.hecha) return a.hecha - b.hecha;
    if (a.vence && b.vence) return a.vence.localeCompare(b.vence);
    if (a.vence) return -1;
    if (b.vence) return 1;
    return b.creada - a.creada;
  });
}

export async function alternarTarea(id: number): Promise<void> {
  const t = await db.tareas.get(id);
  if (!t) return;
  await db.tareas.update(id, { hecha: t.hecha ? 0 : 1 });
}

export async function borrarTarea(id: number): Promise<void> {
  await db.tareas.delete(id);
}

export async function cambiarVencimiento(id: number, vence?: DiaISO): Promise<void> {
  await db.tareas.update(id, { vence });
}
