import { AlertTriangle, Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TipoCaptura } from "../db/db";
import { guardarAudio } from "../db/capturas";
import { procesarCaptura } from "../ia/procesar";
import { hayKey } from "../ia/ajustes";
import { duracionAudio, useGrabadora } from "../lib/grabacion";

/** Por debajo de esto, el gesto fue un toque y no un «mantener». */
const TOQUE_MS = 450;
/** Menos que esto no es una idea, es un resbalón. */
const MINIMO_UTIL_MS = 700;

/**
 * Un solo gesto para las cinco secciones: si mantienes, graba mientras
 * aguantas y se guarda al soltar; si tocas, se queda grabando y el siguiente
 * toque la cierra. Aguantar tres minutos para el diario no es razonable, y
 * obligar a dos toques para una idea de seis segundos tampoco.
 */
export function BotonGrabar({
  tipo,
  color,
  label,
  onGuardada,
}: {
  tipo: TipoCaptura;
  color: string;
  label: string;
  onGuardada?: () => void;
}) {
  const { estado, ms, onda, error, iniciar, detener, cancelar } = useGrabadora();
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const presion = useRef(0);
  const esperandoSoltar = useRef(false);

  const grabando = estado === "grabando" || estado === "pidiendo";

  const terminar = async () => {
    const grabacion = await detener();
    if (!grabacion) return;
    if (grabacion.duracionMs < MINIMO_UTIL_MS) {
      setAviso("Muy corto. Mantén el botón mientras hablas.");
      setTimeout(() => setAviso(null), 3200);
      return;
    }
    setGuardando(true);
    try {
      const id = await guardarAudio(tipo, grabacion.blob, grabacion.duracionMs);
      onGuardada?.();
      // El audio ya está a salvo. Que la IA falle no puede perderlo.
      if (await hayKey()) {
        try {
          await procesarCaptura(id);
        } catch (e) {
          setAviso(e instanceof Error ? e.message : "No se pudo procesar.");
          setTimeout(() => setAviso(null), 5000);
        }
      }
      onGuardada?.();
    } finally {
      setGuardando(false);
    }
  };

  // El oyente de la ventana se registra una sola vez, así que necesita una
  // referencia siempre fresca en vez de la versión capturada del primer render.
  const terminarRef = useRef(terminar);
  terminarRef.current = terminar;

  const alPresionar = (e: React.PointerEvent) => {
    e.preventDefault();
    if (guardando || grabando) return;
    presion.current = Date.now();
    esperandoSoltar.current = true;
    void iniciar();
  };

  /**
   * El «soltar» se escucha en la ventana, no en el botón. Al empezar a grabar,
   * el botón se reemplaza por la píldora: si el oyente estuviera en el botón,
   * se desmontaría antes de que levantes el dedo y la grabación no se cerraría
   * nunca.
   */
  useEffect(() => {
    const soltar = () => {
      if (!esperandoSoltar.current) return;
      esperandoSoltar.current = false;
      // Un toque corto deja la grabación corriendo: se cierra con el botón de
      // detener. Mantener y soltar la cierra al levantar el dedo.
      if (Date.now() - presion.current >= TOQUE_MS) void terminarRef.current();
    };
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, []);

  const mensaje = aviso ?? error;

  return (
    <div
      style={{
        position: "absolute",
        // Se ancla al panel de contenido, que ya está por encima de la
        // navegación y de la barra de sesión activa.
        bottom: "var(--hueco-inferior, 16px)",
        left: 0,
        right: 0,
        display: "grid",
        placeItems: "center",
        padding: "0 16px",
        zIndex: 20,
      }}
    >
      {mensaje && (
        <div
          className="card fade"
          style={{
            marginBottom: 8,
            padding: "9px 13px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12.5,
            color: "var(--ink2)",
            maxWidth: "100%",
            boxShadow: "var(--sombra)",
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          {mensaje}
        </div>
      )}

      {grabando ? (
        <div
          className="fade"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: color,
            color: "var(--paper)",
            padding: "10px 14px",
            borderRadius: 999,
            boxShadow: "var(--sombra)",
            maxWidth: "100%",
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
            onClick={() => void terminar()}
            aria-label="Terminar la grabación"
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "var(--paper)",
              color,
              touchAction: "none",
            }}
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      ) : (
        <button
          className="btn"
          disabled={guardando}
          onPointerDown={alPresionar}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: color,
            color: "var(--paper)",
            padding: "11px 18px 11px 14px",
            borderRadius: 999,
            boxShadow: "var(--sombra)",
            touchAction: "none",
            userSelect: "none",
            opacity: guardando ? 0.8 : 1,
          }}
        >
          {guardando ? (
            <Loader2 size={19} className="girando" strokeWidth={1.8} />
          ) : (
            <Mic size={19} strokeWidth={1.8} />
          )}
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>
            {guardando ? "Guardando…" : label}
          </span>
        </button>
      )}
    </div>
  );
}
