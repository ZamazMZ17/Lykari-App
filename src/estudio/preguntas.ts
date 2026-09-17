import { db } from "../db/db";
import type { PreguntaCurso } from "./tipos";

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
 * Selecciona preguntas para un quiz. Prioriza las que el usuario más falla
 * (spaced repetition básico). Si `cursoId` es null, mezcla de todos los cursos.
 */
export async function seleccionarParaQuiz(
  cantidad: number,
  cursoId: number | null,
): Promise<PreguntaCurso[]> {
  const todas = cursoId != null ? await preguntasDeCurso(cursoId) : await todasLasPreguntas();
  if (todas.length <= cantidad) return mezclarPreguntas(todas);

  // Prioridad: menos veces correcta / más veces vista (peor ratio) primero,
  // luego las nunca vistas, luego las bien aprendidas.
  const ordenadas = [...todas].sort((a, b) => {
    const ratioA = a.vecesVista === 0 ? 0.5 : a.vecesCorrecta / a.vecesVista;
    const ratioB = b.vecesVista === 0 ? 0.5 : b.vecesCorrecta / b.vecesVista;
    return ratioA - ratioB;
  });

  // Tomar las peores con algo de variación
  const pool = ordenadas.slice(0, Math.min(cantidad * 3, todas.length));
  return mezclar(pool).slice(0, cantidad).map(mezclarPregunta);
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
