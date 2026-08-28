import { ArrowLeft, X } from "lucide-react";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useAtras } from "../lib/ganchos";

/** Cuánto hay que arrastrar (px) o soltar rápido (px/s) para que el
 *  arrastre cuente como "cerrar" en vez de volver a su lugar. */
const CIERRE_PX = 120;
const CIERRE_VEL = 500;

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
        <h1 className="disp disp-27" style={{ fontSize: 27, margin: "3px 0 0", lineHeight: 1.05 }}>
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
  // Con "reducir movimiento", un cross-fade corto en vez del spring de
  // subida/arrastre (skill de diseño Apple, §14) — nunca cero feedback.
  const sinMovimiento = useReducedMotion();
  const nodo = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  // Un solo valor para entrada, arrastre y salida — todo el movimiento pasa
  // por acá, nunca se salta de un valor "lógico" a otro (skill, §3).
  const y = useMotionValue(sinMovimiento ? 0 : 24);
  // Protegido con useRef (no state): tiene que poder ejecutarse una sola vez
  // por Hoja, sin importar si lo dispara el botón X, el scrim, el arrastre
  // confirmado o el atrás de Android — cualquier otra vía desincroniza la
  // pila de useAtras (ver src/lib/ganchos.ts).
  const cerrando = useRef(false);
  const velocidadSuelta = useRef(0);

  const iniciarCierre = useCallback(() => {
    if (cerrando.current) return;
    cerrando.current = true;
    const altura = nodo.current?.offsetHeight ?? 600;
    animate(
      y,
      altura,
      sinMovimiento
        ? { duration: 0.2, onComplete: onClose }
        : {
            type: "spring",
            bounce: 0.15,
            velocity: velocidadSuelta.current,
            duration: 0.35,
            onComplete: onClose,
          },
    );
  }, [onClose, sinMovimiento, y]);

  // El atrás/gesto de Android pasa por la misma puerta que el resto: nunca
  // llama a onClose directamente.
  useAtras(true, iniciarCierre);

  useEffect(() => {
    animate(y, 0, sinMovimiento ? { duration: 0.2 } : { type: "spring", bounce: 0, duration: 0.4 });
    // Solo al montar: es la animación de entrada, una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alSoltarDrag = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > CIERRE_PX || info.velocity.y > CIERRE_VEL) {
      velocidadSuelta.current = info.velocity.y;
      iniciarCierre();
    } else {
      // No llegó al umbral: vuelve a su lugar. No toca onClose ni el
      // historial — como si el arrastre nunca hubiera pasado.
      animate(y, 0, { type: "spring", bounce: 0, duration: 0.3 });
    }
  };

  return (
    <div
      className="fade"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--scrim)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 40,
      }}
      onClick={iniciarCierre}
    >
      <motion.div
        ref={nodo}
        className="noscroll"
        onClick={(e) => e.stopPropagation()}
        drag={sinMovimiento ? false : "y"}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.15 }}
        onDragEnd={alSoltarDrag}
        style={{
          y,
          width: "100%",
          // En tablet la hoja no se estira de borde a borde: un formulario de
          // un metro de ancho no se lee.
          maxWidth: 560,
          background: "var(--material-hoja)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: "20px 20px 0 0",
          padding: "18px 20px calc(24px + var(--safe-b))",
          maxHeight: "88%",
          overflowY: "auto",
          overflowX: "hidden",
          borderTop: "1px solid var(--line)",
          boxShadow: "var(--sombra-hoja)",
        }}
      >
        {!sinMovimiento && (
          <div
            onPointerDown={(e) => dragControls.start(e)}
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "var(--line)",
              margin: "-6px auto 10px",
              touchAction: "none",
            }}
          />
        )}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="disp disp-21" style={{ fontSize: 21, margin: "3px 0 0" }}>
              {titulo}
            </h2>
          </div>
          <button className="btn" onClick={iniciarCierre} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
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
    <motion.button
      className="btn"
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", bounce: 0, duration: 0.15 }}
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
    </motion.button>
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
