import { useLiveQuery } from "dexie-react-hooks";
import type { Curso } from "../db/db";
import { analisisCursoAula, diasHasta } from "../db/aula";

const redondear = (n: number) => Math.round(n * 10) / 10;

export function ResumenCursoUPC({ curso }: { curso: Curso }) {
  const datos = useLiveQuery(() => analisisCursoAula(curso), [curso.id, curso.notaObjetivo]);
  if (!datos) return null;
  const dias = diasHasta(datos.proximo?.vence);
  return <section className="card" style={{ padding: "12px 13px", marginBottom: 20 }}>
    <div className="eyebrow" style={{ marginBottom: 7 }}>Registro académico</div>
    {datos.pesoEvaluado > 0 ? <div style={{ display: "grid", gap: 4, fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.45 }}>
      <div>Evaluado: <strong style={{ color: "var(--ink)" }}>{redondear(datos.pesoEvaluado)}%</strong> · promedio registrado: <strong style={{ color: "var(--ink)" }}>{redondear(datos.promedioRendido ?? 0)}/20</strong></div>
      {datos.notaNecesaria !== undefined && <div>Para la referencia de {datos.objetivo}/20, el promedio matemático restante sería <strong style={{ color: "var(--ink)" }}>{redondear(datos.notaNecesaria)}/20</strong>.</div>}
    </div> : <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.45 }}>Todavía no hay suficientes pesos y notas oficiales para proyectar una nota.</p>}
    <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 8, lineHeight: 1.45 }}>Estudio registrado: <strong style={{ color: "var(--ink)" }}>{datos.minutos7} min en 7 días</strong> · {datos.minutos28} min en 28 días.{datos.proximo && ` Próximo: ${datos.proximo.titulo}${dias !== undefined ? ` (${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`})` : ""}.`}</div>
  </section>;
}
