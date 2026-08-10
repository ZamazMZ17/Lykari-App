import { Mic, PenLine } from "lucide-react";
import { useState } from "react";
import type { Actividad, Sesion } from "../db/db";
import { duracionLarga, msRegistrados } from "../lib/tiempo";
import { BotonPrincipal, Hoja } from "../ui/piezas";

/**
 * Fase 1: el camino por defecto debería ser grabar, pero la grabación es de la
 * fase 2. Mientras tanto queda escribir, y sigue existiendo el escape de dejar
 * el audio pendiente — nunca se bloquea al usuario para cerrar su sesión.
 */
export function CerrarSesion({
  act,
  sesion,
  ahora,
  onGuardar,
  onClose,
}: {
  act: Actividad;
  sesion: Sesion;
  ahora: number;
  onGuardar: (opciones: { transcripcion?: string; audioPendiente: boolean }) => void;
  onClose: () => void;
}) {
  const [modo, setModo] = useState<"audio" | "texto">("texto");
  const [texto, setTexto] = useState("");
  const ok = texto.trim().length > 10;
  const ms = msRegistrados(sesion, ahora);

  return (
    <Hoja onClose={onClose} titulo="Antes de cerrar" eyebrow={`${act.nombre} · ${duracionLarga(ms)}`}>
      <p style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, margin: "0 0 18px" }}>
        Cuenta qué hiciste y cómo te fue. Sin esto la sesión queda como tiempo vacío y el análisis
        de la noche no puede decirte nada útil.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {([
          ["audio", "Grabar", Mic],
          ["texto", "Escribir", PenLine],
        ] as const).map(([k, l, I]) => (
          <button
            key={k}
            className="btn"
            onClick={() => setModo(k)}
            aria-pressed={modo === k}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              fontSize: 13,
              display: "flex",
              gap: 6,
              justifyContent: "center",
              alignItems: "center",
              background: modo === k ? "var(--ink)" : "transparent",
              color: modo === k ? "var(--paper)" : "var(--ink2)",
              border: `1px solid ${modo === k ? "var(--ink)" : "var(--line)"}`,
            }}
          >
            <I size={14} /> {l}
          </button>
        ))}
      </div>

      {modo === "audio" ? (
        <div style={{ textAlign: "center", padding: "6px 0 20px" }}>
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "var(--line)",
              color: "var(--ink2)",
              margin: "0 auto",
            }}
          >
            <Mic size={30} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 14, lineHeight: 1.5 }}>
            La grabación llega en la fase 2. Por ahora escribe, o guarda dejando el audio
            pendiente para grabarlo después.
          </div>
        </div>
      ) : (
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          placeholder="Hice tres series pero descansé mucho entre cada una…"
          style={{
            width: "100%",
            minHeight: 118,
            padding: 13,
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--ground)",
            fontSize: 14,
            resize: "none",
          }}
        />
      )}

      <div style={{ marginTop: 14 }}>
        <BotonPrincipal
          disabled={modo === "texto" ? !ok : true}
          onClick={() => onGuardar({ transcripcion: texto, audioPendiente: false })}
        >
          Guardar sesión
        </BotonPrincipal>
      </div>

      <button
        className="btn"
        onClick={() => onGuardar({ audioPendiente: true })}
        style={{ width: "100%", padding: "12px 0 2px", fontSize: 12.5, color: "var(--ink2)" }}
      >
        Guardar y dejar el audio pendiente
      </button>
    </Hoja>
  );
}
