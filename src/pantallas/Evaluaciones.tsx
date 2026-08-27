import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Evaluacion } from "../db/db";
import type { NuevaEvaluacion } from "../db/evaluaciones";
import { resumenNotas } from "../db/evaluaciones";
import { fechaCorta } from "../lib/fecha";
import { BotonPrincipal } from "../ui/piezas";

const campo: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 11,
  border: "1px solid var(--line)",
  background: "var(--ground)",
  fontSize: 14,
};

/** Nunca proyecta ni opina: solo suma lo que ya hay, como el resto de la app. */
export function ResumenEvaluaciones({ evaluaciones }: { evaluaciones: Evaluacion[] }) {
  if (evaluaciones.length === 0) return null;
  const { pesoEvaluado, puntosAcumulados, promedioRendido } = resumenNotas(evaluaciones);
  return (
    <div className="card" style={{ padding: "13px 15px", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {pesoEvaluado > 0 ? puntosAcumulados.toFixed(1) : "—"}
            <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 400 }}> / 20</span>
          </div>
          <div className="eyebrow" style={{ fontSize: 9 }}>
            acumulado
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {pesoEvaluado}%
          </div>
          <div className="eyebrow" style={{ fontSize: 9 }}>
            del curso rendido
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {pesoEvaluado > 0 ? promedioRendido.toFixed(1) : "—"}
          </div>
          <div className="eyebrow" style={{ fontSize: 9 }}>
            promedio de lo rendido
          </div>
        </div>
      </div>
    </div>
  );
}

export function FilaEvaluacion({
  ev,
  onNota,
  onEditar,
}: {
  ev: Evaluacion;
  onNota: (nota: number | undefined) => void;
  onEditar: () => void;
}) {
  const [valor, setValor] = useState(ev.nota?.toString() ?? "");

  const confirmar = () => {
    const limpio = valor.trim();
    if (!limpio) {
      onNota(undefined);
      return;
    }
    const n = Math.min(20, Math.max(0, Number(limpio)));
    if (!Number.isNaN(n)) onNota(n);
    setValor(n.toString());
  };

  return (
    <div className="card" style={{ padding: "11px 13px", display: "flex", gap: 10, alignItems: "center" }}>
      <button className="btn" onClick={onEditar} style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ev.nombre}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
            {ev.peso}%
          </span>
          {ev.semana != null && (
            <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
              · sem {ev.semana}
            </span>
          )}
          {ev.fecha && <span className="chip">{fechaCorta(ev.fecha)}</span>}
          {ev.recuperable && <span className="chip">recuperable</span>}
        </div>
      </button>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        inputMode="decimal"
        placeholder="—"
        aria-label={`Nota de ${ev.nombre}`}
        className="mono"
        style={{
          width: 46,
          flexShrink: 0,
          textAlign: "center",
          padding: "8px 0",
          borderRadius: 9,
          border: `1px solid ${ev.hecha ? "var(--pino)" : "var(--line)"}`,
          background: ev.hecha ? "rgba(31,77,63,.07)" : "var(--ground)",
          fontSize: 14,
          fontWeight: 700,
        }}
      />
    </div>
  );
}

export function FormularioEvaluacion({
  inicial,
  onGuardar,
  onEliminar,
}: {
  inicial?: Evaluacion;
  onGuardar: (datos: NuevaEvaluacion) => void;
  onEliminar?: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [peso, setPeso] = useState(inicial?.peso ?? 10);
  const [semana, setSemana] = useState(inicial?.semana?.toString() ?? "");
  const [fecha, setFecha] = useState(inicial?.fecha ?? "");
  const [recuperable, setRecuperable] = useState(inicial?.recuperable ?? false);

  const listo = nombre.trim().length > 0 && peso > 0;

  return (
    <div>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. Práctica Calificada 1"
        autoFocus
        style={{ ...campo, marginBottom: 10, fontSize: 15 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 4 }}>Peso (%)</div>
          <input
            type="number"
            min={0}
            max={100}
            value={peso}
            onChange={(e) => setPeso(Number(e.target.value))}
            style={campo}
          />
        </label>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 4 }}>Semana (opcional)</div>
          <input
            type="number"
            min={1}
            max={20}
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
            placeholder="—"
            style={campo}
          />
        </label>
      </div>
      <label style={{ display: "block", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 4 }}>
          Fecha (opcional — si la pones, aparece en Horario)
        </div>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={campo} />
      </label>
      <button
        className="btn chip"
        onClick={() => setRecuperable(!recuperable)}
        aria-pressed={recuperable}
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          padding: "7px 12px",
          marginBottom: 20,
          border: `1px solid ${recuperable ? "var(--pino)" : "var(--line)"}`,
          color: recuperable ? "var(--pino)" : "var(--ink2)",
        }}
      >
        {recuperable && <Check size={12} />}
        Es recuperable
      </button>

      <BotonPrincipal
        disabled={!listo}
        onClick={() =>
          onGuardar({
            nombre,
            peso,
            semana: semana.trim() ? Number(semana) : undefined,
            fecha: fecha || undefined,
            recuperable,
          })
        }
      >
        {inicial ? "Guardar cambios" : "Agregar evaluación"}
      </BotonPrincipal>
      {onEliminar && (
        <button
          className="btn"
          onClick={onEliminar}
          style={{
            width: "100%",
            padding: "13px 0",
            marginTop: 8,
            borderRadius: 14,
            border: "1px solid var(--line)",
            color: "var(--ink2)",
            display: "flex",
            gap: 8,
            justifyContent: "center",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <Trash2 size={15} /> Eliminar evaluación
        </button>
      )}
    </div>
  );
}

export function ListaEvaluaciones({
  evaluaciones,
  onNota,
  onEditar,
  onNueva,
}: {
  evaluaciones: Evaluacion[];
  onNota: (id: number, nota: number | undefined) => void;
  onEditar: (ev: Evaluacion) => void;
  onNueva: () => void;
}) {
  return (
    <div>
      <ResumenEvaluaciones evaluaciones={evaluaciones} />
      {evaluaciones.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 12px", lineHeight: 1.5 }}>
          Todavía no agregaste ninguna evaluación. Cópialas del sílabo: nombre, peso, y la semana o
          fecha si ya la sabes.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {evaluaciones.map((ev) => (
            <FilaEvaluacion
              key={ev.id}
              ev={ev}
              onNota={(nota) => onNota(ev.id!, nota)}
              onEditar={() => onEditar(ev)}
            />
          ))}
        </div>
      )}
      <button
        className="btn chip"
        onClick={onNueva}
        style={{ display: "flex", gap: 6, alignItems: "center" }}
      >
        <Plus size={13} /> Agregar evaluación
      </button>
    </div>
  );
}
