import { Bot, CalendarDays, ChevronRight, GraduationCap, Pause, Play, Plus, X } from "lucide-react";
import type { Actividad, Sesion } from "../db/db";
import { fechaLarga } from "../lib/fecha";
import { icono } from "../lib/iconos";
import { enMinutos, estaPausada } from "../lib/tiempo";
import { Barra, BotonAjustes, Header, Nota } from "../ui/piezas";

const ETIQUETA_ALCANCE = {
  hoy: "Solo hoy",
  semana: "Esta semana",
  mes: "Este mes",
  siempre: "Siempre",
  personalizado: "Este ciclo",
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
  onAjustes,
  onHorario,
  aulaNovedades,
  aulaProximas,
  onAula,
  onSam,
  onPrivado,
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
  /** Ajustes cuelga de la raíz de la app, no de una pestaña intermedia. */
  onAjustes: () => void;
  /** La agenda vive como contexto de Hoy; no compite con las tres áreas principales. */
  onHorario: () => void;
  aulaNovedades: number;
  aulaProximas: number;
  onAula: () => void;
  onSam: () => void;
  /** Entrada a Zamly (contraseña) — a propósito sin nada que lo describa. */
  onPrivado: () => void;
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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn card"
              onClick={onHorario}
              style={{ padding: 9, display: "flex" }}
              aria-label="Ver agenda"
            >
              <CalendarDays size={18} />
            </button>
            <button
              className="btn card"
              onClick={onPrivado}
              style={{ padding: 9, display: "flex" }}
              aria-label="Privado"
            >
              <X size={18} />
            </button>
            <BotonAjustes onClick={onAjustes} />
            <button
              className="btn card"
              onClick={onNueva}
              style={{ padding: 9, display: "flex" }}
              aria-label="Agregar actividad"
            >
              <Plus size={18} />
            </button>
          </div>
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

      <button className="btn card" onClick={onAula} style={{ margin: "0 20px 16px", width: "calc(100% - 40px)", padding: "12px 14px", display: "flex", gap: 11, alignItems: "center", textAlign: "left" }}>
        <GraduationCap size={18} color="var(--pino)" />
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Universidad</div>
          <div style={{ fontSize: 13.5 }}>{aulaNovedades ? `${aulaNovedades} novedades del aula` : aulaProximas ? `${aulaProximas} fechas próximas` : "Aula UPC y fechas académicas"}</div>
        </div>
        <ChevronRight size={16} color="var(--ink2)" />
      </button>

      <button className="btn card" onClick={onSam} style={{ margin: "0 20px 16px", width: "calc(100% - 40px)", padding: "12px 14px", display: "flex", gap: 11, alignItems: "center", textAlign: "left" }}>
        <Bot size={18} color="var(--pino)" />
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Tu laptop</div>
          <div style={{ fontSize: 13.5 }}>Asistente Sam</div>
        </div>
        <ChevronRight size={16} color="var(--ink2)" />
      </button>

      {actividades.length === 0 ? (
        <Nota>El tablón está vacío.</Nota>
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
                  borderColor: esActiva ? "var(--ambar)" : min > 0 ? "var(--pino)" : "var(--line)",
                  background: !esActiva && min > 0 ? "var(--tinte-pino)" : "var(--paper)",
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
    </div>
  );
}
