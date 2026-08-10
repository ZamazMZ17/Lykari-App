import { db, type Sesion } from "./db";
import { aISO, desdeISO, diasEntre, hoyISO, sumarDias, type DiaISO } from "../lib/fecha";
import { msRegistrados } from "../lib/tiempo";

export interface ResumenDiario {
  dia: DiaISO;
  ms: number;
  sesiones: number;
}

/** Rango inclusivo, con todos los días presentes aunque estén vacíos. */
export async function resumenPorDia(
  desde: DiaISO,
  hasta: DiaISO,
  ahora = Date.now(),
): Promise<ResumenDiario[]> {
  const filas = await db.sesiones.where("dia").between(desde, hasta, true, true).toArray();

  const porDia = new Map<DiaISO, ResumenDiario>();
  for (let i = 0; i <= diasEntre(desde, hasta); i++) {
    const dia = aISO(sumarDias(desdeISO(desde), i));
    porDia.set(dia, { dia, ms: 0, sesiones: 0 });
  }
  for (const s of filas) {
    const entrada = porDia.get(s.dia);
    if (!entrada) continue;
    entrada.ms += msRegistrados(s, ahora);
    entrada.sesiones++;
  }
  return [...porDia.values()];
}

/** Los días vacíos se muestran vacíos: no se rellenan ni se esconden. */
export function agruparPorSemana(dias: ResumenDiario[]): ResumenDiario[] {
  const grupos = new Map<DiaISO, ResumenDiario>();
  for (const d of dias) {
    const fecha = desdeISO(d.dia);
    const lunes = aISO(sumarDias(fecha, -((fecha.getDay() + 6) % 7)));
    const g = grupos.get(lunes) ?? { dia: lunes, ms: 0, sesiones: 0 };
    g.ms += d.ms;
    g.sesiones += d.sesiones;
    grupos.set(lunes, g);
  }
  return [...grupos.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

export function agruparPorMes(dias: ResumenDiario[]): ResumenDiario[] {
  const grupos = new Map<string, ResumenDiario>();
  for (const d of dias) {
    const mes = d.dia.slice(0, 7) + "-01";
    const g = grupos.get(mes) ?? { dia: mes, ms: 0, sesiones: 0 };
    g.ms += d.ms;
    g.sesiones += d.sesiones;
    grupos.set(mes, g);
  }
  return [...grupos.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

export interface RepartoActividad {
  nombre: string;
  ms: number;
}

/** Cuánto se fue en cada actividad dentro de un rango. */
export async function repartoPorActividad(
  desde: DiaISO,
  hasta: DiaISO,
  ahora = Date.now(),
): Promise<RepartoActividad[]> {
  const sesiones = await db.sesiones.where("dia").between(desde, hasta, true, true).toArray();
  const porId = new Map<number, number>();
  for (const s of sesiones) {
    porId.set(s.actividadId, (porId.get(s.actividadId) ?? 0) + msRegistrados(s, ahora));
  }
  const nombres = await db.actividades.bulkGet([...porId.keys()]);
  return [...porId.entries()]
    .map(([id, ms], i) => ({ nombre: nombres[i]?.nombre ?? `Actividad ${id}`, ms }))
    .sort((a, b) => b.ms - a.ms);
}

/**
 * Días desde el último registro de cada actividad viva. Es el dato que
 * sostiene frases como «once días sin ejercicio y sigue en el tablón»: sin él
 * el análisis tendría que suponer, y suponer está prohibido.
 */
export async function diasSinRegistro(
  hasta: DiaISO = hoyISO(),
): Promise<{ nombre: string; alcance: string; dias: number | null }[]> {
  const vivas = await db.actividades.where("activa").equals(1).toArray();
  const salida = [];
  for (const a of vivas) {
    const ultima = await db.sesiones
      .where("actividadId")
      .equals(a.id!)
      .reverse()
      .sortBy("inicio");
    const dia = ultima[0]?.dia;
    salida.push({
      nombre: a.nombre,
      alcance: a.alcance,
      dias: dia ? diasEntre(dia, hasta) : null,
    });
  }
  return salida;
}

/** Días con al menos una sesión, para la racha y para saber qué cerrar. */
export async function diasConRegistro(desde: DiaISO, hasta: DiaISO): Promise<Set<DiaISO>> {
  const sesiones = await db.sesiones.where("dia").between(desde, hasta, true, true).toArray();
  const capturas = await db.capturas.where("fecha").between(desde, hasta, true, true).toArray();
  const dias = new Set<DiaISO>();
  for (const s of sesiones) dias.add(s.dia);
  for (const c of capturas) if (c.estado !== "eliminada") dias.add(c.fecha);
  return dias;
}

export async function sesionesDe(dia: DiaISO): Promise<Sesion[]> {
  return db.sesiones.where("dia").equals(dia).sortBy("inicio");
}

/**
 * Primer día del que hay algo registrado. Sin esto, el análisis mira días
 * anteriores a que existiera la app y los cuenta como días sin actividad —
 * «quince días seguidos sin sesiones» cuando en realidad no había nada que
 * registrar todavía.
 */
export async function primerDiaConDatos(): Promise<DiaISO | null> {
  const sesion = await db.sesiones.orderBy("inicio").first();
  const captura = await db.capturas.orderBy("creada").first();
  const dias = [sesion?.dia, captura?.fecha].filter(Boolean) as DiaISO[];
  return dias.length ? dias.sort()[0] : null;
}
