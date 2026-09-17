import type { PreguntaCurso } from "./tipos";

export type TipoPeriodoEstudio = "semana" | "unidad";

export interface RangoPeriodoEstudio {
  tipo: TipoPeriodoEstudio;
  desde: number;
  hasta: number;
}

/** La estructura respeta cómo está organizado el material local del Ciclo 6. */
export function tipoPeriodoCurso(nombre: string): TipoPeriodoEstudio {
  const normalizado = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalizado.includes("arquitectura") || normalizado.includes("diseno") ? "unidad" : "semana";
}

export function numeroPeriodo(fuente: string | undefined, tipo: TipoPeriodoEstudio): number | null {
  if (!fuente) return null;
  const patron = tipo === "unidad" ? /unidad\s*(\d+)/i : /semana\s*(\d+)/i;
  const directo = fuente.match(patron);
  if (directo) return Number(directo[1]);
  // Algunos archivos de Diseño nombran la sesión como «S1», «S2»…
  if (tipo === "semana") return Number(fuente.match(/(?:^|\W)S(\d+)(?:\W|$)/i)?.[1]) || null;
  return null;
}

export function periodosDisponibles(preguntas: Pick<PreguntaCurso, "fuente">[], tipo: TipoPeriodoEstudio): number[] {
  return [...new Set(preguntas.flatMap((pregunta) => {
    const numero = numeroPeriodo(pregunta.fuente, tipo);
    return numero == null ? [] : [numero];
  }))].sort((a, b) => a - b);
}

export function estaEnRango(pregunta: Pick<PreguntaCurso, "fuente">, rango: RangoPeriodoEstudio | undefined): boolean {
  if (!rango) return true;
  const numero = numeroPeriodo(pregunta.fuente, rango.tipo);
  return numero != null && numero >= rango.desde && numero <= rango.hasta;
}
