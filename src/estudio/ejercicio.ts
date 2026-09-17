import { db } from "../db/db";
import { planDeActividad, registroDeHoy } from "../db/planes";
import { msRegistrados } from "../lib/tiempo";

/** Más de 40 minutos reales: las pausas no cuentan. */
export const MINIMO_EJERCICIO_MS = 40 * 60_000;

export type ElegibilidadEjercicio =
  | { elegible: true; sesionId: number }
  | { elegible: false; motivo: "sesion_inexistente" | "no_ejercicio" | "sesion_abierta" | "tiempo_insuficiente" | "rutina_incompleta" };

/**
 * Una recompensa solo puede nacer de la sesión de Ejercicio que acaba de
 * cerrarse: no cuenta GymFace, las pausas ni una lista de rutina de otro día.
 */
export async function evaluarEjercicioParaDesbloqueo(sesionId: number): Promise<ElegibilidadEjercicio> {
  const sesion = await db.sesiones.get(sesionId);
  if (!sesion) return { elegible: false, motivo: "sesion_inexistente" };
  if (sesion.fin === null || sesion.abierta) return { elegible: false, motivo: "sesion_abierta" };

  const plan = await planDeActividad(sesion.actividadId);
  if (!plan || plan.categoria !== "ejercicio") return { elegible: false, motivo: "no_ejercicio" };
  if (msRegistrados(sesion, sesion.fin) <= MINIMO_EJERCICIO_MS) {
    return { elegible: false, motivo: "tiempo_insuficiente" };
  }

  const registro = await registroDeHoy(plan.id!, sesion.dia);
  if (!registro || !registro.completo || registro.sesionId !== sesionId) {
    return { elegible: false, motivo: "rutina_incompleta" };
  }
  return { elegible: true, sesionId };
}
