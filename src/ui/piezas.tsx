import { ArrowLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { useAtras } from "../lib/ganchos";

export function Header({
  eyebrow,
  title,
  right,
  onBack,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div style={{ padding: "18px 20px 10px", display: "flex", alignItems: "flex-end", gap: 12 }}>
      {onBack && (
        <button className="btn" onClick={onBack} style={{ marginBottom: 4 }} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="disp" style={{ fontSize: 27, margin: "3px 0 0", lineHeight: 1.05 }}>
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}

export function Anillo({
  v,
  meta,
  size = 34,
  color = "var(--pino)",
  grosor = 3,
  fondo = "none",
}: {
  v: number;
  meta: number;
  size?: number;
  color?: string;
  grosor?: number;
  /**
   * Relleno del interior. En el riel del camino hace falta opaco: si no, el
   * hilo que une los círculos se ve por dentro y parte el número a la mitad.
   */
  fondo?: string;
}) {
  const r = size / 2 - grosor;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, meta > 0 ? v / meta : v > 0 ? 1 : 0);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill={fondo} stroke="var(--line)" strokeWidth={grosor} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
      />
    </svg>
  );
}

/**
 * La barra crece con lo registrado. La marca de referencia es una raya fina:
 * pasarse de ella no cambia el color ni marca nada. Es normal pasarse.
 */
export function Barra({
  v,
  meta,
  color = "var(--pino)",
}: {
  v: number;
  meta: number;
  color?: string;
}) {
  const max = Math.max(meta, v, 1);
  return (
    <div
      style={{
        position: "relative",
        height: 4,
        background: "var(--line)",
        borderRadius: 2,
        marginTop: 7,
      }}
    >
      <div
        style={{
          width: `${(v / max) * 100}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width .4s ease-out",
        }}
      />
      {meta > 0 && (
        <div
          title="referencia"
          style={{
            position: "absolute",
            left: `${(meta / max) * 100}%`,
            top: -3,
            width: 1.5,
            height: 10,
            background: "var(--ink2)",
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}

export function Hoja({
  children,
  onClose,
  titulo,
  eyebrow,
}: {
  children: ReactNode;
  onClose: () => void;
  titulo: string;
  eyebrow?: string;
}) {
  useAtras(true, onClose);
  return (
    <div
      className="fade"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(21,26,18,.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        className="sheet noscroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          // En tablet la hoja no se estira de borde a borde: un formulario de
          // un metro de ancho no se lee.
          maxWidth: 560,
          background: "var(--paper)",
          borderRadius: "20px 20px 0 0",
          padding: "18px 20px calc(24px + var(--safe-b))",
          maxHeight: "88%",
          overflowY: "auto",
          borderTop: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="disp" style={{ fontSize: 21, margin: "3px 0 0" }}>
              {titulo}
            </h2>
          </div>
          <button className="btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BotonPrincipal({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="btn"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "15px 0",
        borderRadius: 14,
        fontWeight: 500,
        fontSize: 15,
        background: disabled ? "var(--line)" : "var(--pino)",
        color: disabled ? "var(--ink2)" : "var(--paper)",
      }}
    >
      {children}
    </button>
  );
}

/** Estado vacío o pantalla de fase pendiente. Nunca culpa al usuario. */
export function Nota({ children, icono }: { children: ReactNode; icono?: ReactNode }) {
  return (
    <div
      className="card"
      style={{
        margin: "16px 20px 0",
        padding: 14,
        display: "flex",
        gap: 11,
        alignItems: "flex-start",
        borderStyle: "dashed",
      }}
    >
      {icono}
      <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}
