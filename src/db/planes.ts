import { db, type CategoriaPlan, type NivelDePlan, type Plan, type RegistroPlan } from "./db";
import { crearActividad, type NuevaActividad } from "./acciones";
import { hoyISO, type DiaISO } from "../lib/fecha";

/**
 * Ejercicio y GymFace muestran una guía práctica, no una prueba que aprobar.
 * El nivel cambia solo con práctica que la persona registró; no baja solo ni
 * bloquea. Guardar una parte de la rutina también es un registro válido.
 */

const RUTINA_EJERCICIO: NivelDePlan[] = [
  {
    numero: 1,
    nombre: "Nivel 1 · Base",
    sesionesParaSubir: 8,
    dias: [
      {
        titulo: "Cuerpo completo A",
        ejercicios: [
          { nombre: "Sentadillas", detalle: "3 series x 10", descansoSeg: 60 },
          { nombre: "Flexiones inclinadas o de pared", detalle: "3 series x 6–10", descansoSeg: 60 },
          { nombre: "Plancha", detalle: "3 series x 20 s", descansoSeg: 45 },
          { nombre: "Puente de glúteo", detalle: "3 series x 12", descansoSeg: 45 },
        ],
      },
      {
        titulo: "Cuerpo completo B",
        ejercicios: [
          { nombre: "Zancadas hacia atrás", detalle: "3 series x 8 por pierna", descansoSeg: 60 },
          { nombre: "Buenos días sin peso", detalle: "3 series x 12", descansoSeg: 45 },
          { nombre: "Abdominales cortos", detalle: "3 series x 10", descansoSeg: 45 },
          { nombre: "Plancha lateral", detalle: "2 series x 15 s por lado", descansoSeg: 30 },
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
        titulo: "Cuerpo completo A",
        ejercicios: [
          { nombre: "Sentadillas con pausa", detalle: "4 series x 12", descansoSeg: 60 },
          { nombre: "Flexiones inclinadas", detalle: "4 series x 8–12", descansoSeg: 60 },
          { nombre: "Plancha", detalle: "3 series x 35 s", descansoSeg: 45 },
          { nombre: "Puente de glúteo", detalle: "4 series x 15", descansoSeg: 45 },
        ],
      },
      {
        titulo: "Cuerpo completo B",
        ejercicios: [
          { nombre: "Zancadas hacia atrás", detalle: "4 series x 10 por pierna", descansoSeg: 60 },
          { nombre: "Sentadilla isométrica en pared", detalle: "3 series x 30 s", descansoSeg: 45 },
          { nombre: "Dead bug", detalle: "3 series x 10 por lado", descansoSeg: 45 },
          { nombre: "Superman", detalle: "3 series x 12", descansoSeg: 30 },
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
        titulo: "Cuerpo completo A",
        ejercicios: [
          { nombre: "Flexiones", detalle: "4 series x 8–12", descansoSeg: 75 },
          { nombre: "Sentadilla lenta", detalle: "4 series x 15", descansoSeg: 60 },
          { nombre: "Plancha con toques de hombro", detalle: "3 series x 30 s", descansoSeg: 45 },
          { nombre: "Puente de glúteo a una pierna", detalle: "3 series x 8 por pierna", descansoSeg: 60 },
        ],
      },
      {
        titulo: "Cuerpo completo B",
        ejercicios: [
          { nombre: "Zancadas", detalle: "4 series x 12 por pierna", descansoSeg: 75 },
          { nombre: "Sentadilla con salto opcional", detalle: "3 series x 8", descansoSeg: 75 },
          { nombre: "Abdominales bicicleta", detalle: "3 series x 12 por lado", descansoSeg: 45 },
          { nombre: "Plancha lateral", detalle: "3 series x 25 s por lado", descansoSeg: 30 },
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
        titulo: "Cuerpo completo A",
        ejercicios: [
          { nombre: "Flexiones con pausa", detalle: "4 series x 10", descansoSeg: 90 },
          { nombre: "Sentadilla a una pierna asistida", detalle: "3 series x 6 por pierna", descansoSeg: 90 },
          { nombre: "Plancha con elevación de pierna", detalle: "3 series x 40 s", descansoSeg: 45 },
          { nombre: "Puente de glúteo a una pierna", detalle: "3 series x 12 por pierna", descansoSeg: 60 },
        ],
      },
      {
        titulo: "Cuerpo completo B",
        ejercicios: [
          { nombre: "Zancada atrás con pausa", detalle: "4 series x 10 por pierna", descansoSeg: 75 },
          { nombre: "Sentadilla con salto opcional", detalle: "4 series x 10", descansoSeg: 75 },
          { nombre: "Hollow hold", detalle: "3 series x 25 s", descansoSeg: 45 },
          { nombre: "Plancha frontal larga", detalle: "3 series x 55 s", descansoSeg: 45 },
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
    // Antes esto salía en silencio si la actividad se había retirado mientras
    // la hoja seguía abierta. La pantalla necesita poder explicarlo en vez de
    // parecer que el botón no funcionó.
    if (!plan) throw new Error("Esta rutina ya no está disponible. Ciérrala y vuelve a abrir Ejercicio.");
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
