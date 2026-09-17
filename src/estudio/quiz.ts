import { db } from "../db/db";
import { hoyISO } from "../lib/fecha";
import { motorControl } from "../control/servicio";
import { seleccionarParaQuiz, registrarRespuesta } from "./preguntas";
import type { EstadoQuiz, SesionEstudio } from "./tipos";
import type { OrigenCreditoEstudio, ResultadoCreditoEstudio } from "../control/tipos";
import type { RangoPeriodoEstudio } from "./periodos";

export function crearQuiz(preguntas: EstadoQuiz["preguntas"]): EstadoQuiz {
  return {
    fase: "pregunta",
    cursoId: null,
    preguntas,
    indice: 0,
    respuestas: new Array(preguntas.length).fill(null),
    correctas: 0,
    inicio: Date.now(),
  };
}

export async function iniciarQuiz(
  cantidad: number,
  cursoId: number | null,
  rango?: RangoPeriodoEstudio,
): Promise<EstadoQuiz | null> {
  const preguntas = await seleccionarParaQuiz(cantidad, cursoId, rango);
  if (preguntas.length === 0) return null;
  return { ...crearQuiz(preguntas), cursoId };
}

export function responder(quiz: EstadoQuiz, opcion: number): EstadoQuiz {
  const pregunta = quiz.preguntas[quiz.indice];
  const correcta = opcion === pregunta.respuestaCorrecta;
  const respuestas = [...quiz.respuestas];
  respuestas[quiz.indice] = opcion;

  if (pregunta.id != null) {
    void registrarRespuesta(pregunta.id, correcta);
  }

  return {
    ...quiz,
    fase: "feedback",
    respuestas,
    correctas: quiz.correctas + (correcta ? 1 : 0),
  };
}

export function siguiente(quiz: EstadoQuiz): EstadoQuiz {
  const siguiente = quiz.indice + 1;
  if (siguiente >= quiz.preguntas.length) {
    return { ...quiz, fase: "resultado" };
  }
  return { ...quiz, fase: "pregunta", indice: siguiente };
}

export function aprobo(quiz: EstadoQuiz, umbral: number): boolean {
  return quiz.correctas >= umbral;
}

export async function finalizarQuiz(
  quiz: EstadoQuiz,
  paquete?: string,
): Promise<ResultadoCreditoEstudio | undefined> {
  const sesion: Omit<SesionEstudio, "id"> = {
    fecha: hoyISO(),
    cursoId: quiz.cursoId ?? undefined,
    respondidas: quiz.preguntas.length,
    correctas: quiz.correctas,
    duracionMs: Date.now() - quiz.inicio,
    // Solo se escribe después de que Android confirme el crédito. Un quiz
    // aprobado al llegar al tope sigue siendo estudio, no minutos ganados.
    minutosGanados: 0,
    creada: Date.now(),
  };
  const sesionId = await db.sesionesEstudio.add(sesion as SesionEstudio);

  if (paquete) {
    try {
      const resultado = await motorControl().registrarDesbloqueoEstudio({
        paquete,
        origen: "quiz" satisfies OrigenCreditoEstudio,
      });
      if (resultado.concedido) await db.sesionesEstudio.update(sesionId, { minutosGanados: 15 });
      return resultado;
    } catch {
      // En web/mock no hay motor nativo; el crédito queda solo en IndexedDB.
    }
  }
}
