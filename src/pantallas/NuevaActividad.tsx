import { Check, Target } from "lucide-react";
import { useState } from "react";
import type { Actividad, Alcance, TipoActividad } from "../db/db";
import type { NuevaActividad as Datos } from "../db/acciones";
import { ICONOS, ICONO_POR_DEFECTO } from "../lib/iconos";
import { BotonPrincipal, Hoja } from "../ui/piezas";

const ALCANCES: [Alcance, string][] = [
  ["hoy", "Solo hoy"],
  ["semana", "Toda la semana"],
  ["mes", "Todo el mes"],
];

const TIPOS: [TipoActividad, string, string][] = [
  ["enfoque", "Ciérrala a las 3 h", "Para estudiar, leer, ejercicio."],
  [
    "recreativa",
    "Avísame y sigue contando",
    "Para series y películas: cerrarla escondería el tiempo real.",
  ],
];

/**
 * Los campos, sin la `Hoja` que los envuelve. Así se puede montar dentro de
 * una hoja que ya está abierta (ej. el detalle de una actividad pasando a
 * modo edición) sin abrir una segunda hoja: `useAtras` espera que cada hoja
 * montada empuje y consuma una sola entrada del historial, y abrir una
 * segunda encima de la primera sin cerrarla rompe esa cuenta.
 */
export function FormularioActividad({
  inicial,
  onGuardar,
}: {
  inicial?: Actividad;
  onGuardar: (datos: Datos) => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [alcance, setAlcance] = useState<Alcance>(inicial?.alcance ?? "semana");
  const [tipo, setTipo] = useState<TipoActividad>(inicial?.tipo ?? "enfoque");
  const [referenciaMin, setReferencia] = useState(inicial?.referenciaMin ?? 30);
  const [icono, setIcono] = useState(inicial?.icono ?? ICONO_POR_DEFECTO);

  const listo = nombre.trim().length > 0;

  return (
    <>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="¿Qué quieres hacer?"
        autoFocus
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--ground)",
          fontSize: 15,
          marginBottom: 18,
        }}
      />

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Ícono
      </div>
      <div
        className="noscroll"
        style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}
      >
        {Object.entries(ICONOS).map(([k, I]) => (
          <button
            key={k}
            className="btn"
            onClick={() => setIcono(k)}
            aria-label={k}
            aria-pressed={icono === k}
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${icono === k ? "var(--pino)" : "var(--line)"}`,
              background: icono === k ? "var(--pino)" : "transparent",
              color: icono === k ? "var(--paper)" : "var(--ink2)",
            }}
          >
            <I size={18} strokeWidth={1.7} />
          </button>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Aparece en el tablón
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {ALCANCES.map(([k, l]) => (
          <button
            key={k}
            className="btn"
            onClick={() => setAlcance(k)}
            aria-pressed={alcance === k}
            style={{
              flex: 1,
              padding: "10px 4px",
              borderRadius: 10,
              fontSize: 12.5,
              border: `1px solid ${alcance === k ? "var(--ink)" : "var(--line)"}`,
              background: alcance === k ? "var(--ink)" : "transparent",
              color: alcance === k ? "var(--paper)" : "var(--ink2)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Tiempo de referencia
      </div>
      <div
        className="card"
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 8,
        }}
      >
        <Target size={17} color="var(--ink2)" />
        <div className="mono" style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>
          {referenciaMin > 0 ? `${referenciaMin} min` : "sin marca"}
        </div>
        <button
          className="btn"
          onClick={() => setReferencia(Math.max(0, referenciaMin - 5))}
          aria-label="Menos cinco minutos"
          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)" }}
        >
          −
        </button>
        <button
          className="btn"
          onClick={() => setReferencia(referenciaMin + 5)}
          aria-label="Más cinco minutos"
          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)" }}
        >
          +
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Solo se muestra como marca. No corta la sesión ni cuenta como fallo.
      </p>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Si te olvidas de cerrarla
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 22 }}>
        {TIPOS.map(([k, l, s]) => (
          <button
            key={k}
            className="btn"
            onClick={() => setTipo(k)}
            aria-pressed={tipo === k}
            style={{
              textAlign: "left",
              padding: "11px 13px",
              borderRadius: 12,
              border: `1px solid ${tipo === k ? "var(--pino)" : "var(--line)"}`,
              background: tipo === k ? "var(--tinte-pino)" : "transparent",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {tipo === k && <Check size={14} color="var(--pino)" />}
              {l}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{s}</div>
          </button>
        ))}
      </div>

      <BotonPrincipal
        disabled={!listo}
        onClick={() => onGuardar({ nombre, icono, alcance, referenciaMin, tipo })}
      >
        {inicial ? "Guardar cambios" : "Agregar al tablón"}
      </BotonPrincipal>
    </>
  );
}

export function NuevaActividad({
  onClose,
  onGuardar,
}: {
  onClose: () => void;
  onGuardar: (datos: Datos) => void;
}) {
  return (
    <Hoja onClose={onClose} eyebrow="Tablón" titulo="Nueva actividad">
      <FormularioActividad onGuardar={onGuardar} />
    </Hoja>
  );
}
