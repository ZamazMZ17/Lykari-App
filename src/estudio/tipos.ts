import type { DiaISO } from "../lib/fecha";

export interface PreguntaCurso {
  id?: number;
  cursoId: number;
  tema: string;
  pregunta: string;
  opciones: string[];
  /** Índice en `opciones` de la respuesta correcta. */
  respuestaCorrecta: number;
  explicacion?: string;
  /** Archivo y sección de clase de donde salió; nunca una rúbrica o fecha. */
  fuente?: string;
  vecesVista: number;
  vecesCorrecta: number;
}

export interface TarjetaEstudio {
  id?: number;
  cursoId: number;
  tema: string;
  frente: string;
  reverso: string;
  fuente: string;
  creada: number;
}

export interface SesionEstudio {
  id?: number;
  fecha: DiaISO;
  cursoId?: number;
  respondidas: number;
  correctas: number;
  duracionMs: number;
  minutosGanados: number;
  creada: number;
}

export interface EstadoQuiz {
  fase: "selector" | "pregunta" | "feedback" | "resultado";
  cursoId: number | null;
  preguntas: PreguntaCurso[];
  indice: number;
  respuestas: (number | null)[];
  correctas: number;
  inicio: number;
}
