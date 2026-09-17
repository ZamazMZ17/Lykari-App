import { db } from "../db/db";
import type { PreguntaCurso } from "./tipos";
import { estaEnRango, type RangoPeriodoEstudio } from "./periodos";

export async function preguntasDeCurso(cursoId: number): Promise<PreguntaCurso[]> {
  return db.preguntasCurso.where("cursoId").equals(cursoId).toArray();
}

export async function todasLasPreguntas(): Promise<PreguntaCurso[]> {
  return db.preguntasCurso.toArray();
}

export async function contarPreguntas(): Promise<number> {
  return db.preguntasCurso.count();
}

export async function agregarPregunta(p: Omit<PreguntaCurso, "id" | "vecesVista" | "vecesCorrecta">): Promise<number> {
  return db.preguntasCurso.add({ ...p, vecesVista: 0, vecesCorrecta: 0 });
}

export async function agregarPreguntas(ps: Omit<PreguntaCurso, "id" | "vecesVista" | "vecesCorrecta">[]): Promise<void> {
  await db.preguntasCurso.bulkAdd(ps.map((p) => ({ ...p, vecesVista: 0, vecesCorrecta: 0 })));
}

export async function registrarRespuesta(id: number, correcta: boolean): Promise<void> {
  await db.preguntasCurso
    .where("id")
    .equals(id)
    .modify((p) => {
      p.vecesVista++;
      if (correcta) p.vecesCorrecta++;
    });
}

/**
 * Selecciona preguntas para un quiz. Prioriza las nunca vistas, luego las que
 * el usuario más falla (spaced repetition), y entre las bien aprendidas elige
 * las menos repetidas para dar variedad.
 */
export async function seleccionarParaQuiz(
  cantidad: number,
  cursoId: number | null,
  rango?: RangoPeriodoEstudio,
): Promise<PreguntaCurso[]> {
  const candidatas = cursoId != null ? await preguntasDeCurso(cursoId) : await todasLasPreguntas();
  const todas = candidatas.filter((pregunta) => estaEnRango(pregunta, rango));
  if (todas.length <= cantidad) return mezclarPreguntas(todas);

  const nuncaVistas = todas.filter((p) => p.vecesVista === 0);
  const vistas = todas.filter((p) => p.vecesVista > 0);

  vistas.sort((a, b) => {
    const ratioA = a.vecesCorrecta / a.vecesVista;
    const ratioB = b.vecesCorrecta / b.vecesVista;
    if (Math.abs(ratioA - ratioB) > 0.1) return ratioA - ratioB;
    return a.vecesVista - b.vecesVista;
  });

  const seleccion: PreguntaCurso[] = [];
  const nuncaMezcladas = mezclar(nuncaVistas);
  for (const p of nuncaMezcladas) {
    if (seleccion.length >= cantidad) break;
    seleccion.push(p);
  }
  for (const p of vistas) {
    if (seleccion.length >= cantidad) break;
    seleccion.push(p);
  }

  return mezclar(seleccion).map(mezclarPregunta);
}

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** La respuesta correcta no puede conservar siempre la misma posición. */
function mezclarPregunta(pregunta: PreguntaCurso): PreguntaCurso {
  const indices = pregunta.opciones.map((_, i) => i);
  const orden = mezclar(indices);
  return {
    ...pregunta,
    opciones: orden.map((i) => pregunta.opciones[i]),
    respuestaCorrecta: orden.indexOf(pregunta.respuestaCorrecta),
  };
}

function mezclarPreguntas(preguntas: PreguntaCurso[]): PreguntaCurso[] {
  return mezclar(preguntas).map(mezclarPregunta);
}
