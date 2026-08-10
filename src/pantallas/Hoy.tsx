import { Pause, Play, Plus } from "lucide-react";
import type { Actividad, Sesion } from "../db/db";
import { fechaLarga } from "../lib/fecha";
import { icono } from "../lib/iconos";
import { enMinutos, estaPausada } from "../lib/tiempo";
import { Barra, Header, Nota } from "../ui/piezas";

const ETIQUETA_ALCANCE = {
  hoy: "Solo hoy",
  semana: "Esta semana",
  mes: "Este mes",
} as const;

export function Hoy({
  actividades,
  msPorActividad,
  msTotal,
  sesionesHoy,
  abierta,
  amplia,
  onNueva,
  onIniciar,
  onAlternarPausa,
  onDetalle,
}: {
  actividades: Actividad[];
  msPorActividad: Map<number, number>;
  msTotal: number;
  sesionesHoy: number;
  abierta: Sesion | undefined;
  /** En tablet las actividades se reparten en columnas. */
  amplia?: boolean;
  onNueva: () => void;
  onIniciar: (a: Actividad) => void;
  onAlternarPausa: () => void;
  onDetalle: (a: Actividad) => void;
}) {
  const franja: [string, string | number][] = [
    ["min registrados", enMinutos(msTotal)],
    ["sesiones", sesionesHoy],
    ["actividades", actividades.length],
  ];

  return (
    <div style={{ paddingBottom: 20 }}>
      <Header
        eyebrow={fechaLarga()}
        title="Tablón de hoy"
        right={
          <button
            className="btn card"
            onClick={onNueva}
            style={{ padding: 9, display: "flex" }}
            aria-label="Agregar actividad"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div style={{ display: "flex", gap: 8, padding: "6px 20px 16px" }}>
        {franja.map(([l, v]) => (
          <div key={l} className="card" style={{ flex: 1, padding: "9px 10px" }}>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
              {v}
            </div>
            <div className="eyebrow" style={{ fontSize: 9 }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      {actividades.length === 0 ? (
        <Nota>
          El tablón está vacío. Agrega lo primero que quieras registrar hoy: no hace falta
          planear la semana entera ni comprometerse con una duración.
        </Nota>
      ) : (
        <div
          style={{
            padding: "0 20px",
            display: "grid",
            gap: 8,
            gridTemplateColumns: amplia ? "repeat(auto-fill, minmax(330px, 1fr))" : undefined,
          }}
        >
          {actividades.map((a, i) => {
            const Ico = icono(a.icono);
            const esActiva = abierta?.actividadId === a.id;
            const pausada = esActiva && abierta ? estaPausada(abierta) : false;
            const min = enMinutos(msPorActividad.get(a.id!) ?? 0);
            return (
              <div
                key={a.id}
                className="card"
                style={{
                  padding: "13px 14px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  borderColor: esActiva ? "var(--ambar)" : "var(--line)",
                }}
              >
                <div className="mono" style={{ fontSize: 11, color: "var(--ink2)", width: 16 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <Ico size={19} color="var(--pino)" strokeWidth={1.7} />
                <button
                  className="btn"
                  onClick={() => onDetalle(a)}
                  style={{ flex: 1, minWidth: 0, textAlign: "left" }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.nombre}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      marginTop: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    <span className="chip">{ETIQUETA_ALCANCE[a.alcance]}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
                      {min > 0 ? `${min} min hoy` : "sin registro"}
                    </span>
                    {a.referenciaMin > 0 && (
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--ink2)", opacity: 0.7 }}
                      >
                        · ref {a.referenciaMin}′
                      </span>
                    )}
                  </div>
                  <Barra v={min} meta={a.referenciaMin} />
                </button>
                <button
                  className="btn"
                  onClick={() => (esActiva ? onAlternarPausa() : onIniciar(a))}
                  aria-label={
                    esActiva
                      ? pausada
                        ? `Continuar ${a.nombre}`
                        : `Pausar ${a.nombre}`
                      : `Iniciar ${a.nombre}`
                  }
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    background: esActiva ? "var(--ambar)" : "var(--pino)",
                    color: "var(--paper)",
                  }}
                >
                  {esActiva && !pausada ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ padding: "16px 20px 0", fontSize: 12, color: "var(--ink2)", lineHeight: 1.5 }}>
        El tiempo de referencia no corta nada. Si lo pasas, no pasa nada: queda registrado lo que
        de verdad hiciste.
      </p>
    </div>
  );
}
