/** Formatos de práctica. La puerta conserva una exigencia breve y clara;
 * el simulacro replica una práctica de 30 ítems sin conceder acceso a apps. */
export type TipoQuiz = "puerta" | "simulacro";

export interface ConfiguracionQuiz {
  tipo: TipoQuiz;
  cantidad: number;
  umbral?: number;
  puntosPorRespuesta?: number;
}

export const QUIZ_PUERTA: ConfiguracionQuiz = {
  tipo: "puerta",
  cantidad: 12,
  umbral: 10,
};

export const SIMULACRO_PRACTICA: ConfiguracionQuiz = {
  tipo: "simulacro",
  cantidad: 30,
  puntosPorRespuesta: 0.5,
};
