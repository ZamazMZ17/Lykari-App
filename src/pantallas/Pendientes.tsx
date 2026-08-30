import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Captura, Tarea } from "../db/db";
import {
  alternarTarea,
  borrarTarea,
  cambiarEstado,
  cambiarVencimiento,
} from "../db/capturas";
import { procesarCaptura } from "../ia/procesar";
import { diasEntre, fechaCorta, hoyISO, type DiaISO } from "../lib/fecha";
import { BotonGrabar } from "../ui/BotonGrabar";
import { Reproductor } from "../ui/Audio";
import { Header, Nota } from "../ui/piezas";
import type { Seccion } from "./Capturar";

/** La hora que dijo al grabarla, si dijo alguna. */
const horaDe = (ms: number) =>
  new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });

/** Sin dramatismo: es un dato, no un reproche. Y sin rojo, nunca. */
function textoVencimiento(vence?: DiaISO): string {
  if (!vence) return "sin fecha";
  const d = diasEntre(hoyISO(), vence);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Era ayer";
  if (d > 1 && d <= 7) return `En ${d} días`;
  if (d < -1) return `Era el ${fechaCorta(vence)}`;
  return fechaCorta(vence);
}

export function Pendientes({
  seccion,
  tareas,
  sinProcesar,
  tieneKey,
  onBack,
}: {
  seccion: Seccion;
  tareas: Tarea[];
  sinProcesar: Captura[];
  tieneKey: boolean;
  /** Sin volver en tablet: la lista de secciones ya está al lado. */
  onBack?: () => void;
}) {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div style={{ paddingBottom: 132 }}>
      <Header eyebrow="Capturar" title="Pendientes" onBack={onBack} />

      <div style={{ padding: "6px 20px 0", display: "grid", gap: 8 }}>
        {sinProcesar.map((c) => (
          <AudioSinProcesar key={c.id} captura={c} tieneKey={tieneKey} />
        ))}

        {tareas.map((t) => {
          const hecha = !!t.hecha;
          const abierto = abierta === t.id;
          return (
            <div key={t.id} className="card" style={{ overflow: "hidden", opacity: hecha ? 0.55 : 1 }}>
              <div style={{ padding: "13px 15px", display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  className="btn"
                  onClick={() => void alternarTarea(t.id!)}
                  aria-label={hecha ? `Desmarcar ${t.texto}` : `Marcar ${t.texto} como hecha`}
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: 7,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    border: `1.5px solid ${hecha ? "var(--pend)" : "var(--line)"}`,
                    background: hecha ? "var(--pend)" : "transparent",
                  }}
                >
                  {hecha && <Check size={13} color="var(--paper)" strokeWidth={3} />}
                </button>

                <button
                  className="btn"
                  onClick={() => setAbierta(abierto ? null : t.id!)}
                  style={{ flex: 1, minWidth: 0, textAlign: "left" }}
                >
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 500,
                      textDecoration: hecha ? "line-through" : "none",
                    }}
                  >
                    {t.texto}
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 4 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--ink2)",
                        display: "flex",
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                      <Clock size={11} /> {textoVencimiento(t.vence)}
                      {t.recordatorio && ` · ${horaDe(t.recordatorio)}`}
                    </span>
                    {t.origenCierre && (
                      <span className="chip" style={{ fontSize: 10 }}>
                        del análisis
                      </span>
                    )}
                  </div>
                </button>

                {abierto ? (
                  <ChevronDown size={16} color="var(--ink2)" />
                ) : (
                  <ChevronRight size={16} color="var(--ink2)" />
                )}
              </div>

              {abierto && (
                <div style={{ padding: "0 15px 14px 48px" }}>
                  {t.descripcion && (
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "var(--ink2)",
                        margin: "0 0 10px",
                      }}
                    >
                      {t.descripcion}
                    </p>
                  )}
                  {t.caduca && (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "var(--ink2)",
                        margin: "0 0 10px",
                      }}
                    >
                      Salió del análisis del {fechaCorta(t.origenCierre ?? t.caduca)} y desaparece
                      sola el {fechaCorta(t.caduca)} si no la haces. Una lista que solo crece es
                      la misma trampa de la que veníamos.
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <label
                      className="chip"
                      style={{
                        display: "flex",
                        gap: 5,
                        alignItems: "center",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      <Clock size={12} />
                      {t.vence ? "Cambiar fecha" : "Poner fecha"}
                      <input
                        type="date"
                        value={t.vence ?? ""}
                        onChange={(e) =>
                          void cambiarVencimiento(t.id!, e.target.value || undefined)
                        }
                        style={{
                          position: "absolute",
                          opacity: 0,
                          width: 1,
                          height: 1,
                          pointerEvents: "none",
                        }}
                      />
                    </label>
                    <button
                      className="btn chip"
                      onClick={() => void borrarTarea(t.id!)}
                      style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tareas.length === 0 && sinProcesar.length === 0 && (
        <Nota>Nada pendiente.</Nota>
      )}

      <BotonGrabar tipo="pendiente" color={seccion.color} label={seccion.label} />
    </div>
  );
}

function AudioSinProcesar({ captura, tieneKey }: { captura: Captura; tieneKey: boolean }) {
  const [procesando, setProcesando] = useState(false);

  const reintentar = async () => {
    setProcesando(true);
    try {
      await procesarCaptura(captura.id!);
    } catch {
      // Queda escrito en la captura.
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="card" style={{ padding: "13px 15px", borderStyle: "dashed" }}>
      <div style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.5 }}>
        {captura.error ??
          (tieneKey
            ? "Audio en cola: de aquí saldrán las tareas."
            : "Audio guardado. Las tareas salen cuando pongas la API key.")}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {captura.audioBlob && (
          <Reproductor blob={captura.audioBlob} duracionMs={captura.duracionMs} />
        )}
        {tieneKey && (
          <button
            className="btn chip"
            onClick={reintentar}
            disabled={procesando}
            style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
          >
            {procesando ? <Loader2 size={12} className="girando" /> : <RotateCcw size={12} />}
            {procesando ? "Procesando" : "Reintentar"}
          </button>
        )}
        <button
          className="btn chip"
          onClick={() => void cambiarEstado(captura.id!, "eliminada")}
          style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
        >
          <Trash2 size={12} /> Eliminar
        </button>
      </div>
    </div>
  );
}
