import { AlertTriangle, Mic, PenLine, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Actividad, Sesion } from "../db/db";
import { duracionAudio, useGrabadora, type Grabacion } from "../lib/grabacion";
import { duracionLarga, msRegistrados } from "../lib/tiempo";
import { Reproductor } from "../ui/Audio";
import { BotonPrincipal, Hoja } from "../ui/piezas";

/** Por debajo de esto, el gesto fue un toque y no un «mantener». */
const TOQUE_MS = 450;
/** Menos que esto no es una nota, es un resbalón. */
const MINIMO_UTIL_MS = 700;

/**
 * Grabar de verdad, con el mismo gesto que en Capturar: mantén para grabar
 * mientras hablas, o toca para dejarla corriendo hasta el botón de detener.
 * El escape de "guardar y dejar pendiente" sigue existiendo: nunca se bloquea
 * al usuario para cerrar su sesión.
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
  onGuardar: (opciones: {
    transcripcion?: string;
    audioBlob?: Blob;
    audioPendiente: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [modo, setModo] = useState<"audio" | "texto">("audio");
  const [texto, setTexto] = useState("");
  const [grabacion, setGrabacion] = useState<Grabacion | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { estado, ms, onda, error, iniciar, detener, cancelar } = useGrabadora();
  const presion = useRef(0);
  const esperandoSoltar = useRef(false);

  const grabando = estado === "grabando" || estado === "pidiendo";
  const msSesion = msRegistrados(sesion, ahora);

  const okTexto = texto.trim().length > 10;
  const listo = modo === "audio" ? grabacion !== null : okTexto;

  const terminarGrabacion = async () => {
    const g = await detener();
    if (!g) return;
    if (g.duracionMs < MINIMO_UTIL_MS) {
      setAviso("Muy corto. Mantén el botón mientras hablas.");
      setTimeout(() => setAviso(null), 3200);
      return;
    }
    setGrabacion(g);
  };

  // El oyente de la ventana se registra una sola vez: necesita una referencia
  // siempre fresca en vez de la versión capturada del primer render.
  const terminarRef = useRef(terminarGrabacion);
  terminarRef.current = terminarGrabacion;

  const alPresionar = (e: React.PointerEvent) => {
    e.preventDefault();
    if (grabando) return;
    presion.current = Date.now();
    esperandoSoltar.current = true;
    setGrabacion(null);
    void iniciar();
  };

  useEffect(() => {
    const soltar = () => {
      if (!esperandoSoltar.current) return;
      esperandoSoltar.current = false;
      // Toque corto: sigue grabando hasta el botón de detener. Mantener y
      // soltar la cierra al levantar el dedo.
      if (Date.now() - presion.current >= TOQUE_MS) void terminarRef.current();
    };
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, []);

  const guardar = () => {
    if (modo === "audio" && grabacion) {
      // `audioPendiente: true` aunque el audio ya esté a salvo: significa
      // "pendiente de transcribir", no "no contó nada". Si hay key, App.tsx
      // lo transcribe enseguida y lo baja a `false`; si no, el cierre de la
      // noche sabe que hay algo grabado en vez de asumir que no dijo nada
      // (ia/cierre.ts), y procesarSesionesPendientes lo recoge después.
      onGuardar({ audioBlob: grabacion.blob, audioPendiente: true });
    } else {
      onGuardar({ transcripcion: texto, audioPendiente: false });
    }
  };

  return (
    <Hoja
      onClose={onClose}
      titulo="Antes de cerrar"
      eyebrow={`${act.nombre} · ${duracionLarga(msSesion)}`}
    >
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
            onClick={() => {
              if (grabando) return; // no cambiar de modo a medio grabar
              setModo(k);
            }}
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
        <div style={{ padding: "6px 0 20px" }}>
          {(aviso ?? error) && (
            <div
              className="card"
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "9px 13px",
                marginBottom: 14,
                fontSize: 12.5,
                color: "var(--ink2)",
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {aviso ?? error}
            </div>
          )}

          {grabando ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--pino)",
                  color: "var(--paper)",
                  padding: "10px 16px",
                  borderRadius: 999,
                }}
              >
                <button
                  className="btn"
                  onClick={() => cancelar()}
                  aria-label="Descartar la grabación"
                  style={{ color: "var(--paper)", opacity: 0.75, display: "flex" }}
                >
                  <X size={18} />
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 26 }}>
                  {onda.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        width: 2.5,
                        borderRadius: 2,
                        background: "var(--paper)",
                        opacity: 0.9,
                        height: Math.max(3, v * 24),
                      }}
                    />
                  ))}
                </div>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                  {duracionAudio(ms)}
                </span>
                <button
                  className="btn"
                  onClick={() => void terminarGrabacion()}
                  aria-label="Terminar la grabación"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--paper)",
                    color: "var(--pino)",
                    touchAction: "none",
                  }}
                >
                  <Square size={14} fill="currentColor" />
                </button>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 12 }}>
                {estado === "pidiendo" ? "Pidiendo el micrófono…" : "Grabando…"}
              </div>
            </div>
          ) : grabacion ? (
            <div style={{ textAlign: "center" }}>
              <Reproductor blob={grabacion.blob} duracionMs={grabacion.duracionMs} color="var(--pino)" />
              <button
                className="btn"
                onClick={() => setGrabacion(null)}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "12px auto 0",
                  fontSize: 12.5,
                  color: "var(--ink2)",
                }}
              >
                <RotateCcw size={13} /> Grabar de nuevo
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <button
                className="btn"
                onPointerDown={alPresionar}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--pino)",
                  color: "var(--paper)",
                  margin: "0 auto",
                  touchAction: "none",
                  userSelect: "none",
                }}
              >
                <Mic size={30} strokeWidth={1.6} />
              </button>
              <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 14, lineHeight: 1.5 }}>
                Mantenlo presionado mientras hablas, o tócalo una vez y vuelve a tocarlo para
                terminar.
              </div>
            </div>
          )}
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
        <BotonPrincipal disabled={!listo} onClick={guardar}>
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
