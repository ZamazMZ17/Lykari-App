import { db } from "../db/db";
import { hoyISO } from "../lib/fecha";
import type { SesionEstudio, TipoActividadEstudio } from "./tipos";

const MINIMO_REGISTRABLE_MS = 1_000;

export type ResumenEstudio = {
  msTotal: number;
  porActividad: Record<TipoActividadEstudio, number>;
  porCurso: Map<number, number>;
  porCursoActividad: Map<number, Record<TipoActividadEstudio, number>>;
};

/** Mantiene el estudio separado del cronómetro manual de actividades. */
export async function registrarTiempoEstudio({
  cursoId,
  tipoActividad,
  duracionMs,
  respondidas = 0,
  correctas = 0,
}: {
  cursoId?: number;
  tipoActividad: TipoActividadEstudio;
  duracionMs: number;
  respondidas?: number;
  correctas?: number;
}): Promise<number | undefined> {
  const tiempo = Math.max(0, Math.round(duracionMs));
  if (tiempo < MINIMO_REGISTRABLE_MS) return undefined;
  const sesion: Omit<SesionEstudio, "id"> = {
    fecha: hoyISO(), cursoId, respondidas, correctas, duracionMs: tiempo,
    minutosGanados: 0, tipoActividad, creada: Date.now(),
  };
  return db.sesionesEstudio.add(sesion as SesionEstudio);
}

export function resumirEstudio(sesiones: SesionEstudio[]): ResumenEstudio {
  const porActividad: Record<TipoActividadEstudio, number> = { cuestionario: 0, flashcards: 0, lectura: 0 };
  const porCurso = new Map<number, number>();
  const porCursoActividad = new Map<number, Record<TipoActividadEstudio, number>>();
  let msTotal = 0;
  for (const sesion of sesiones) {
    const tiempo = Math.max(0, sesion.duracionMs || 0);
    msTotal += tiempo;
    porActividad[sesion.tipoActividad ?? "cuestionario"] += tiempo;
    if (sesion.cursoId != null) {
      porCurso.set(sesion.cursoId, (porCurso.get(sesion.cursoId) ?? 0) + tiempo);
      const actividades = porCursoActividad.get(sesion.cursoId) ?? { cuestionario: 0, flashcards: 0, lectura: 0 };
      actividades[sesion.tipoActividad ?? "cuestionario"] += tiempo;
      porCursoActividad.set(sesion.cursoId, actividades);
    }
  }
  return { msTotal, porActividad, porCurso, porCursoActividad };
}
