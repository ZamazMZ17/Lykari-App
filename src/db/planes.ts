import { db, type CategoriaPlan, type NivelDePlan, type Plan, type RegistroPlan } from "./db";
import { crearActividad, type NuevaActividad } from "./acciones";
import { hoyISO, type DiaISO } from "../lib/fecha";

/**
 * Ejercicio y GymFace son la única parte de la app con un plan real y
 * seguimiento de cumplimiento — excepción explícita y acotada a estas dos
 * secciones (ver nota en db/db.ts). El nivel sube solo con práctica real
 * acumulada (sesionesParaSubir días completos), nunca baja solo y nunca
 * bloquea: si no se completa hoy, mañana se puede seguir en el mismo nivel.
 */

const RUTINA_EJERCICIO: NivelDePlan[] = [
  {
    numero: 1,
    nombre: "Nivel 1 · Base",
    sesionesParaSubir: 8,
    dias: [
      {
        titulo: "Empuje + core",
        ejercicios: [
          { nombre: "Flexiones", detalle: "3 series x 8", descansoSeg: 60 },
          { nombre: "Plancha", detalle: "3 series x 20 s", descansoSeg: 45 },
          { nombre: "Fondos en silla", detalle: "3 series x 8", descansoSeg: 60 },
          { nombre: "Zancadas", detalle: "3 series x 10 por pierna", descansoSeg: 45 },
        ],
      },
      {
        titulo: "Tirón + piernas",
        ejercicios: [
          { nombre: "Remo invertido", detalle: "3 series x 8", descansoSeg: 60 },
          { nombre: "Sentadillas", detalle: "3 series x 15", descansoSeg: 60 },
          { nombre: "Puente de glúteo", detalle: "3 series x 15", descansoSeg: 45 },
          { nombre: "Superman", detalle: "3 series x 12", descansoSeg: 30 },
        ],
      },
    ],
  },
  {
    numero: 2,
    nombre: "Nivel 2 · Progresión",
    sesionesParaSubir: 10,
    dias: [
      {
        titulo: "Empuje + core",
        ejercicios: [
          { nombre: "Flexiones", detalle: "4 series x 12", descansoSeg: 60 },
          { nombre: "Plancha", detalle: "3 series x 40 s", descansoSeg: 45 },
          { nombre: "Fondos en silla", detalle: "4 series x 12", descansoSeg: 60 },
          { nombre: "Zancadas caminando", detalle: "3 series x 12 por pierna", descansoSeg: 45 },
        ],
      },
      {
        titulo: "Tirón + piernas",
        ejercicios: [
          { nombre: "Remo invertido", detalle: "4 series x 12", descansoSeg: 60 },
          { nombre: "Sentadilla búlgara", detalle: "3 series x 10 por pierna", descansoSeg: 60 },
          { nombre: "Puente de glúteo a una pierna", detalle: "3 series x 10 por pierna", descansoSeg: 45 },
          { nombre: "Superman con hold", detalle: "3 series x 15 s", descansoSeg: 30 },
        ],
      },
    ],
  },
  {
    numero: 3,
    nombre: "Nivel 3 · Exigente",
    sesionesParaSubir: 12,
    dias: [
      {
        titulo: "Empuje + core",
        ejercicios: [
          { nombre: "Flexiones diamante", detalle: "4 series x 10", descansoSeg: 75 },
          { nombre: "Plancha con toques de hombro", detalle: "3 series x 40 s", descansoSeg: 45 },
          { nombre: "Fondos elevados", detalle: "4 series x 10", descansoSeg: 75 },
          { nombre: "Sentadilla con salto", detalle: "3 series x 10", descansoSeg: 60 },
        ],
      },
      {
        titulo: "Tirón + piernas",
        ejercicios: [
          { nombre: "Dominadas o remo con mochila", detalle: "4 series x 8", descansoSeg: 90 },
          { nombre: "Sentadilla búlgara con peso", detalle: "3 series x 12 por pierna", descansoSeg: 75 },
          { nombre: "Hip thrust a una pierna", detalle: "3 series x 12 por pierna", descansoSeg: 60 },
          { nombre: "Plancha lateral", detalle: "3 series x 30 s por lado", descansoSeg: 30 },
        ],
      },
    ],
  },
  {
    numero: 4,
    nombre: "Nivel 4 · Avanzado",
    // Techo alto a propósito: acá el plan deja de subir de nivel y pasa a
    // ser mantenimiento — no hay un "nivel infinito" que perseguir.
    sesionesParaSubir: 999,
    dias: [
      {
        titulo: "Empuje + core",
        ejercicios: [
          { nombre: "Flexiones arqueras", detalle: "4 series x 8 por lado", descansoSeg: 90 },
          { nombre: "Plancha con elevación de pierna", detalle: "3 series x 45 s", descansoSeg: 45 },
          { nombre: "Fondos a una mano asistidos", detalle: "3 series x 6", descansoSeg: 90 },
          { nombre: "Pistol squat asistida", detalle: "3 series x 6 por pierna", descansoSeg: 90 },
        ],
      },
      {
        titulo: "Tirón + piernas",
        ejercicios: [
          { nombre: "Dominadas lastradas o negativas", detalle: "4 series x 6", descansoSeg: 120 },
          { nombre: "Zancada búlgara con salto", detalle: "3 series x 8 por pierna", descansoSeg: 75 },
          {
            nombre: "Puente de glúteo a una pierna elevado",
            detalle: "3 series x 12 por pierna",
            descansoSeg: 45,
          },
          { nombre: "Plancha frontal larga", detalle: "3 series x 60 s", descansoSeg: 45 },
        ],
      },
    ],
  },
];

const RUTINA_GYMFACE: NivelDePlan[] = [
  {
    numero: 1,
    nombre: "Nivel 1 · Fundamentos",
    sesionesParaSubir: 10,
    dias: [
      {
        titulo: "Rutina base",
        ejercicios: [
          { nombre: "Elevación de cejas resistida", detalle: "3 series x 10", descansoSeg: 20 },
          { nombre: "Sonrisa forzada con labios cerrados", detalle: "3 series x 15 s", descansoSeg: 15 },
          { nombre: "Inflado de mejillas alternado", detalle: "3 series x 10 por lado", descansoSeg: 20 },
          { nombre: "Mentón al techo + labios fruncidos", detalle: "3 series x 10", descansoSeg: 20 },
          { nombre: "Parpadeo lento resistido", detalle: "2 series x 10", descansoSeg: 15 },
        ],
      },
    ],
  },
  {
    numero: 2,
    nombre: "Nivel 2 · Tono",
    sesionesParaSubir: 12,
    dias: [
      {
        titulo: "Rutina base + tono",
        ejercicios: [
          { nombre: "Elevación de cejas resistida", detalle: "3 series x 12", descansoSeg: 20 },
          { nombre: "Sonrisa forzada con labios cerrados", detalle: "3 series x 20 s", descansoSeg: 15 },
          { nombre: "Masaje de mandíbula circular", detalle: "2 min" },
          { nombre: "Resistencia de mejilla con dedo", detalle: "3 series x 12 por lado", descansoSeg: 20 },
          { nombre: "\"Fish face\" sostenido", detalle: "3 series x 15 s", descansoSeg: 15 },
          { nombre: "Elevación de comisuras con resistencia", detalle: "3 series x 10", descansoSeg: 20 },
        ],
      },
    ],
  },
  {
    numero: 3,
    nombre: "Nivel 3 · Simetría fina",
    sesionesParaSubir: 999,
    dias: [
      {
        titulo: "Enfoque unilateral",
        ejercicios: [
          {
            nombre: "Nivel 2, doble serie lado débil",
            detalle: "otro lado, series normales",
            descansoSeg: 20,
          },
          { nombre: "Auto-masaje con aceite", detalle: "3 min" },
        ],
      },
    ],
  },
];

interface PlanSemilla {
  categoria: CategoriaPlan;
  nombreActividad: string;
  icono: string;
  niveles: NivelDePlan[];
}

const PLANES: PlanSemilla[] = [
  { categoria: "ejercicio", nombreActividad: "Ejercicio", icono: "dumbbell", niveles: RUTINA_EJERCICIO },
  { categoria: "gymface", nombreActividad: "GymFace", icono: "smile", niveles: RUTINA_GYMFACE },
];

export function nivelesDe(categoria: CategoriaPlan): NivelDePlan[] {
  return categoria === "ejercicio" ? RUTINA_EJERCICIO : RUTINA_GYMFACE;
}

export function nivelActualDe(plan: Plan): NivelDePlan {
  const niveles = nivelesDe(plan.categoria);
  return niveles.find((n) => n.numero === plan.nivelActual) ?? niveles[0];
}

/** Crea (una sola vez) las actividades permanentes de Ejercicio y GymFace y su plan. */
export async function sembrarRutinasPermanentes(): Promise<void> {
  for (const { categoria, nombreActividad, icono, niveles } of PLANES) {
    const yaExiste = await db.planes.where("categoria").equals(categoria).first();
    if (yaExiste) continue;

    const datos: NuevaActividad = {
      nombre: nombreActividad,
      icono,
      alcance: "siempre",
      referenciaMin: 0,
      tipo: "enfoque",
    };
    const actividadId = await crearActividad(datos);
    await db.planes.add({
      categoria,
      actividadId,
      nivelActual: niveles[0].numero,
      creada: Date.now(),
    });
  }
}

export async function planDeActividad(actividadId: number): Promise<Plan | undefined> {
  return db.planes.where("actividadId").equals(actividadId).first();
}

export async function registrosDePlan(planId: number): Promise<RegistroPlan[]> {
  return db.registrosPlan.where("planId").equals(planId).sortBy("dia");
}

export async function registroDeHoy(planId: number, dia: DiaISO = hoyISO()): Promise<RegistroPlan | undefined> {
  return db.registrosPlan.where({ planId }).and((r) => r.dia === dia).first();
}

/** Qué día de la rotación (Empuje/Tirón, etc.) toca hoy, alternando con cada registro guardado. */
export async function diaRutinaDeHoy(plan: Plan): Promise<number> {
  const nivel = nivelActualDe(plan);
  if (nivel.dias.length <= 1) return 0;
  const registros = await registrosDePlan(plan.id!);
  const enEsteNivel = registros.filter((r) => r.nivelNumero === plan.nivelActual && r.completo);
  return enEsteNivel.length % nivel.dias.length;
}

/**
 * Guarda el avance del día (o lo actualiza si ya se había guardado hoy) y
 * sube de nivel si se llegó al número de sesiones completas que pedía el
 * nivel actual. Nunca baja de nivel sola.
 */
export async function guardarAvanceHoy(
  planId: number,
  diaRutinaIndice: number,
  ejerciciosHechos: string[],
  completo: boolean,
): Promise<void> {
  await db.transaction("rw", db.planes, db.registrosPlan, async () => {
    const plan = await db.planes.get(planId);
    if (!plan) return;
    const dia = hoyISO();
    const existente = await registroDeHoy(planId, dia);

    if (existente) {
      await db.registrosPlan.update(existente.id!, {
        diaRutinaIndice,
        ejerciciosHechos,
        completo: completo ? 1 : 0,
      });
    } else {
      await db.registrosPlan.add({
        planId,
        dia,
        nivelNumero: plan.nivelActual,
        diaRutinaIndice,
        ejerciciosHechos,
        completo: completo ? 1 : 0,
        creada: Date.now(),
      });
    }

    if (!completo) return;
    const nivel = nivelActualDe(plan);
    const registros = await registrosDePlan(planId);
    const completosEnNivel = registros.filter(
      (r) => r.nivelNumero === plan.nivelActual && r.completo,
    ).length;
    if (completosEnNivel >= nivel.sesionesParaSubir) {
      const niveles = nivelesDe(plan.categoria);
      const siguiente = niveles.find((n) => n.numero === plan.nivelActual + 1);
      if (siguiente) await db.planes.update(planId, { nivelActual: siguiente.numero });
    }
  });
}

/** Manual, para el día que fue de más — nunca automático. */
export async function bajarDeNivel(planId: number): Promise<void> {
  const plan = await db.planes.get(planId);
  if (!plan || plan.nivelActual <= 1) return;
  await db.planes.update(planId, { nivelActual: plan.nivelActual - 1 });
}
