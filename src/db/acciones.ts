import { db, type Actividad, type Alcance, type Sesion, type TipoActividad } from "./db";
import { aISO, desdeISO, diaDe, finDeAlcance, hoyISO, type DiaISO } from "../lib/fecha";
import {
  LIMITE_ENFOQUE,
  estaPausada,
  instanteAlAcumular,
  msRegistrados,
} from "../lib/tiempo";

/* ── actividades ─────────────────────────────────────────────────── */

export interface NuevaActividad {
  nombre: string;
  icono: string;
  alcance: Alcance;
  referenciaMin: number;
  tipo: TipoActividad;
}

export async function crearActividad(datos: NuevaActividad): Promise<number> {
  const ahora = new Date();
  return db.actividades.add({
    ...datos,
    nombre: datos.nombre.trim(),
    desde: aISO(ahora),
    hasta: finDeAlcance(datos.alcance, ahora),
    activa: 1,
    creada: ahora.getTime(),
  });
}

/** Quitar del tablón no borra el historial: las sesiones ya registradas quedan. */
export async function retirarActividad(id: number): Promise<void> {
  await db.actividades.update(id, { activa: 0 });
}

/**
 * Todo lo que se eligió al crear la actividad —incluido el alcance— se puede
 * cambiar después. El alcance sigue sin ser retroactivo: `hasta` se
 * recalcula desde el día en que se creó, no desde hoy.
 */
export async function actualizarActividad(id: number, datos: NuevaActividad): Promise<void> {
  const act = await db.actividades.get(id);
  if (!act) return;
  await db.actividades.update(id, {
    ...datos,
    nombre: datos.nombre.trim(),
    hasta: finDeAlcance(datos.alcance, desdeISO(act.desde)),
  });
}

/**
 * Lo que se ve en el tablón: actividades vivas cuyo alcance cubre el día.
 * Con alcance semana o mes aparecen todos los días del periodo, hayan tenido
 * registro o no. Nunca se marca ninguna como incumplida.
 */
export async function actividadesDelTablon(dia: DiaISO = hoyISO()): Promise<Actividad[]> {
  const vivas = await db.actividades.where("activa").equals(1).toArray();
  return vivas
    .filter((a) => a.desde <= dia && dia <= a.hasta)
    .sort((a, b) => a.creada - b.creada);
}

/* ── sesiones ────────────────────────────────────────────────────── */

export async function sesionAbierta(): Promise<Sesion | undefined> {
  return db.sesiones.where("abierta").equals(1).first();
}

export async function sesionesDelDia(dia: DiaISO = hoyISO()): Promise<Sesion[]> {
  return db.sesiones.where("dia").equals(dia).sortBy("inicio");
}

export async function iniciarSesion(actividadId: number): Promise<number> {
  const inicio = Date.now();
  return db.sesiones.add({
    actividadId,
    dia: diaDe(inicio),
    inicio,
    fin: null,
    abierta: 1,
    pausas: [],
    cerradaAuto: false,
    audioPendiente: false,
  });
}

export async function pausarSesion(id: number): Promise<void> {
  await db.transaction("rw", db.sesiones, async () => {
    const s = await db.sesiones.get(id);
    if (!s || !s.abierta || estaPausada(s)) return;
    await db.sesiones.update(id, {
      pausas: [...s.pausas, { desde: Date.now(), hasta: null }],
    });
  });
}

export async function continuarSesion(id: number): Promise<void> {
  await db.transaction("rw", db.sesiones, async () => {
    const s = await db.sesiones.get(id);
    if (!s || !s.abierta) return;
    const pausas = s.pausas.map((p) =>
      p.hasta === null ? { ...p, hasta: Date.now() } : p,
    );
    await db.sesiones.update(id, { pausas });
  });
}

export interface CierreSesion {
  transcripcion?: string;
  audioPendiente?: boolean;
  cerradaAuto?: boolean;
  fin?: number;
}

export async function finalizarSesion(
  id: number,
  opciones: CierreSesion = {},
): Promise<void> {
  await db.transaction("rw", db.sesiones, async () => {
    const s = await db.sesiones.get(id);
    if (!s || !s.abierta) return;
    const fin = opciones.fin ?? Date.now();
    // Una pausa abierta se cierra en el mismo instante final.
    const pausas = s.pausas.map((p) =>
      p.hasta === null ? { ...p, hasta: Math.min(fin, Date.now()) } : p,
    );
    await db.sesiones.update(id, {
      fin,
      abierta: 0,
      pausas,
      transcripcion: opciones.transcripcion?.trim() || undefined,
      audioPendiente: opciones.audioPendiente ?? false,
      cerradaAuto: opciones.cerradaAuto ?? false,
    });
  });
}

/* ── reconciliación al abrir la app ──────────────────────────────── */

/**
 * No hay cron. Al abrir la app (y al volver a ella) se revisa si alguna sesión
 * de tipo *enfoque* pasó de las 3 h mientras el teléfono estaba cerrado. Si es
 * así se cierra en el instante exacto en que llegó al límite, con el audio
 * pendiente — no se inventa tiempo posterior.
 *
 * Las recreativas nunca se tocan: cerrarlas escondería el tiempo real, que es
 * justo el dato que hay que ver.
 *
 * Devuelve las sesiones que se cerraron solas, para poder avisarlo.
 */
export async function reconciliarSesiones(ahora = Date.now()): Promise<Sesion[]> {
  const abiertas = await db.sesiones.where("abierta").equals(1).toArray();
  const cerradas: Sesion[] = [];

  for (const s of abiertas) {
    const act = await db.actividades.get(s.actividadId);
    if (!act || act.tipo !== "enfoque") continue;
    if (msRegistrados(s, ahora) < LIMITE_ENFOQUE) continue;

    const fin = instanteAlAcumular(s, LIMITE_ENFOQUE);
    if (fin === null) continue;
    await finalizarSesion(s.id!, { fin, cerradaAuto: true, audioPendiente: true });
    const guardada = await db.sesiones.get(s.id!);
    if (guardada) cerradas.push(guardada);
  }
  return cerradas;
}

/* ── lecturas derivadas ──────────────────────────────────────────── */

export interface ResumenDia {
  msPorActividad: Map<number, number>;
  msTotal: number;
  sesiones: number;
}

export function resumirDia(sesiones: Sesion[], ahora = Date.now()): ResumenDia {
  const msPorActividad = new Map<number, number>();
  let msTotal = 0;
  for (const s of sesiones) {
    const ms = msRegistrados(s, ahora);
    msPorActividad.set(s.actividadId, (msPorActividad.get(s.actividadId) ?? 0) + ms);
    msTotal += ms;
  }
  return { msPorActividad, msTotal, sesiones: sesiones.length };
}
