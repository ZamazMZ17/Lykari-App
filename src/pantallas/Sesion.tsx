import { AlertTriangle, Pause, Play, Square, Timer } from "lucide-react";
import type { Actividad, Sesion as SesionDB } from "../db/db";
import { icono } from "../lib/iconos";
import {
  AVISO_RECREATIVA,
  LIMITE_ENFOQUE,
  MINUTO,
  cronometro,
  duracionLarga,
  estaPausada,
  msRegistrados,
} from "../lib/tiempo";
import { Header } from "../ui/piezas";

export function Sesion({
  act,
  sesion,
  ahora,
  onAlternar,
  onFin,
  onBack,
}: {
  act: Actividad;
  sesion: SesionDB;
  ahora: number;
  onAlternar: () => void;
  onFin: () => void;
  onBack: () => void;
}) {
  const Ico = icono(act.icono);
  const ms = msRegistrados(sesion, ahora);
  const pausada = estaPausada(sesion);
  const corriendo = !pausada;

  // El anillo se llena hacia la referencia; si no hay, hacia el límite de la
  // actividad. Llenarlo del todo no es un fin: solo deja de crecer.
  const objetivo = act.referenciaMin > 0 ? act.referenciaMin * MINUTO : LIMITE_ENFOQUE;
  const p = Math.min(1, ms / objetivo);
  const R = 90;
  const C = 2 * Math.PI * R;

  const pasoElAviso = act.tipo === "recreativa" && ms >= AVISO_RECREATIVA;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <Header eyebrow="Sesión en curso" title={act.nombre} onBack={onBack} />

      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "10px 20px 0" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              position: "relative",
              display: "inline-grid",
              placeItems: "center",
              marginBottom: 22,
            }}
          >
            <svg width="196" height="196" style={{ transform: "rotate(-90deg)" }} aria-hidden>
              <circle cx="98" cy="98" r={R} fill="none" stroke="var(--line)" strokeWidth="6" />
              <circle
                cx="98"
                cy="98"
                r={R}
                fill="none"
                stroke={corriendo ? "var(--ambar)" : "var(--ink2)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - p)}
              />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <Ico size={22} color="var(--pino)" strokeWidth={1.6} />
              <div className="mono" style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>
                {cronometro(ms)}
              </div>
              <div className={"eyebrow " + (corriendo ? "pulse" : "")} style={{ marginTop: 2 }}>
                {corriendo ? "grabando tiempo" : "en pausa"}
              </div>
            </div>
          </div>

          {act.referenciaMin > 0 && (
            <div className="mono" style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 4 }}>
              querías darle {act.referenciaMin} min
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              color: pasoElAviso ? "var(--ink)" : "var(--ink2)",
              display: "flex",
              gap: 6,
              justifyContent: "center",
              alignItems: "center",
              lineHeight: 1.45,
              maxWidth: 300,
            }}
          >
            {act.tipo === "enfoque" ? (
              <>
                <Timer size={13} style={{ flexShrink: 0 }} /> Se cierra sola a las 3 h si te
                olvidas
              </>
            ) : pasoElAviso ? (
              <>
                <AlertTriangle size={13} color="var(--ambar)" style={{ flexShrink: 0 }} /> Llevas{" "}
                {duracionLarga(ms)} aquí. Sigue contando: es el dato.
              </>
            ) : (
              <>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} /> No se cierra sola. Te aviso a
                las 2 h y sigue contando
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px calc(20px + var(--safe-b))", display: "flex", gap: 10 }}>
        <button
          className="btn card"
          onClick={onAlternar}
          style={{
            flex: 1,
            padding: "15px 0",
            display: "flex",
            justifyContent: "center",
            gap: 8,
            alignItems: "center",
            fontWeight: 500,
          }}
        >
          {corriendo ? (
            <>
              <Pause size={17} /> Pausar
            </>
          ) : (
            <>
              <Play size={17} /> Continuar
            </>
          )}
        </button>
        <button
          className="btn"
          onClick={onFin}
          style={{
            flex: 1,
            padding: "15px 0",
            borderRadius: 14,
            background: "var(--pino)",
            color: "var(--paper)",
            display: "flex",
            justifyContent: "center",
            gap: 8,
            alignItems: "center",
            fontWeight: 500,
          }}
        >
          <Square size={15} fill="currentColor" /> Finalizar
        </button>
      </div>
    </div>
  );
}
