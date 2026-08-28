import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

import { CabezaHusky } from "./Husky";
import { estadoDeLaRacha, piezasDeLaSemana, estaPuesta, type PiezaKey } from "../db/mascota";
import { CLAVE_MASCOTA_OCULTA, CLAVE_MASCOTA_POS, guardarAjuste, leerAjuste } from "../ia/ajustes";
import { hoyISO } from "../lib/fecha";

const TAMANO = 56;
/** La cabeza con orejas es más alta que ancha (proporción del propio dibujo). */
const ALTO = Math.round((TAMANO * 268) / 220);
/** Por debajo de esto el gesto fue un toque, no un arrastre. */
const TOQUE_PX = 6;
/** Cuántas muestras de posición+tiempo se guardan para estimar la velocidad
 *  de suelta — no hace falta el historial completo del gesto. */
const HISTORIAL_MAX = 5;
/** Misma constante que usa Apple en «Designing Fluid Interfaces» para que un
 *  flick proyecte hacia dónde iba el gesto, no solo hasta el punto de suelta
 *  (skill de diseño Apple, §6). */
const DECAIMIENTO = 0.998;
function proyectar(velocidadPxSeg: number): number {
  return ((velocidadPxSeg / 1000) * DECAIMIENTO) / (1 - DECAIMIENTO);
}

interface Posicion {
  lado: "izq" | "der";
  /** 0 = arriba de la zona permitida, 1 = abajo. */
  fraccion: number;
}

const POR_DEFECTO: Posicion = { lado: "der", fraccion: 0.62 };

function leerPos(bruto: string | undefined): Posicion {
  if (!bruto) return POR_DEFECTO;
  const [lado, f] = bruto.split(":");
  const fraccion = Number(f);
  if ((lado !== "izq" && lado !== "der") || !Number.isFinite(fraccion)) return POR_DEFECTO;
  return { lado, fraccion: Math.min(1, Math.max(0, fraccion)) };
}

/**
 * La mascota flota **dentro de la app**, nunca encima del sistema operativo
 * (CLAUDE.md §3). Se arrastra, se ancla al borde más cercano al soltarla y
 * recuerda dónde quedó. La zona permitida la marcan `--zona-alta` y
 * `--zona-baja`, así nunca tapa la navegación ni la barra de sesión activa.
 */
export function Burbuja({
  progresoSesion,
  onAbrir,
}: {
  /** 0..1 del tiempo de la sesión en curso, o null si no hay ninguna. */
  progresoSesion: number | null;
  onAbrir: () => void;
}) {
  const guardadaPos = useLiveQuery(() => leerAjuste(CLAVE_MASCOTA_POS), []);
  const ocultaEl = useLiveQuery(() => leerAjuste(CLAVE_MASCOTA_OCULTA), []);
  const racha = useLiveQuery(() => estadoDeLaRacha(), []);
  const piezas = useLiveQuery(() => piezasDeLaSemana(), [], []);
  const sinMovimiento = useReducedMotion();

  const [pos, setPos] = useState<Posicion>(POR_DEFECTO);
  const [arrastrando, setArrastrando] = useState(false);
  // Además del arrastre en sí, sigue "flotando" (posición en píxeles, no en
  // el calc() de reposo) mientras el spring de suelta todavía está corriendo.
  const [asentando, setAsentando] = useState(false);
  const nodo = useRef<HTMLDivElement>(null);
  const inicio = useRef({ x: 0, y: 0, movido: false });
  // Punto donde se agarró la burbuja, relativo a su esquina — sin esto,
  // agarrarla de cualquier punto la recentraba bajo el dedo (skill de diseño
  // Apple, §2: la manipulación directa respeta el offset de agarre).
  const desplaz = useRef({ x: TAMANO / 2, y: TAMANO / 2 });
  const historial = useRef<{ x: number; y: number; t: number }[]>([]);
  // Posición en píxeles mientras se arrastra o se asienta. En reposo no se
  // usan: el estilo vuelve al calc() de siempre, que sigue siendo correcto
  // aunque cambie el tamaño de la pantalla (rotación, split-screen).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (guardadaPos !== undefined) setPos(leerPos(guardadaPos));
  }, [guardadaPos]);

  // Escondida solo por el día en que se escondió: mañana vuelve sola.
  if (ocultaEl === hoyISO()) return null;

  const puestas = piezas.filter(estaPuesta).map((p) => p.k as PiezaKey);

  const elementoZona = () => nodo.current?.offsetParent as HTMLElement | null;

  const alMover = (e: PointerEvent) => {
    const elemento = elementoZona();
    const caja = elemento?.getBoundingClientRect();
    if (!caja) return;
    if (
      !inicio.current.movido &&
      Math.hypot(e.clientX - inicio.current.x, e.clientY - inicio.current.y) > TOQUE_PX
    ) {
      inicio.current.movido = true;
      setArrastrando(true);
    }
    if (inicio.current.movido) {
      x.set(e.clientX - caja.left - desplaz.current.x);
      y.set(e.clientY - caja.top - desplaz.current.y);
      historial.current.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      if (historial.current.length > HISTORIAL_MAX) historial.current.shift();
    }
  };

  const alSoltar = async (e: PointerEvent) => {
    window.removeEventListener("pointermove", alMover);
    window.removeEventListener("pointerup", alSoltar);
    window.removeEventListener("pointercancel", alSoltar);

    const elemento = elementoZona();
    const caja = elemento?.getBoundingClientRect();
    setArrastrando(false);

    if (!inicio.current.movido) {
      historial.current = [];
      // Aplazado un tick: si la hoja se monta ahora mismo, el clic que sigue
      // al pointerup cae sobre el botón que acaba de aparecer bajo el dedo.
      setTimeout(onAbrir, 0);
      return;
    }
    if (!caja || !elemento) {
      historial.current = [];
      return;
    }

    // Velocidad de suelta a partir de las primeras y últimas muestras
    // guardadas — no hace falta más que eso para estimar hacia dónde iba.
    const h = historial.current;
    let vx = 0;
    let vy = 0;
    if (h.length >= 2) {
      const a = h[0];
      const b = h[h.length - 1];
      const dt = Math.max(1, b.t - a.t);
      vx = ((b.x - a.x) / dt) * 1000;
      vy = ((b.y - a.y) / dt) * 1000;
    }
    historial.current = [];

    const xPuntero = e.clientX - caja.left;
    const yPuntero = e.clientY - caja.top;

    // Arrastrar no esconde: para eso está el botón de la hoja. El gesto de
    // «sacarla por el borde» se disparaba solo al soltarla cerca del margen, y
    // esconder la mascota sin haberlo pedido es peor que no poder esconderla
    // con un gesto.
    const xProyectada = sinMovimiento ? xPuntero : xPuntero + proyectar(vx);
    const yProyectada = sinMovimiento ? yPuntero : yPuntero + proyectar(vy);
    const lado: Posicion["lado"] = xProyectada < caja.width / 2 ? "izq" : "der";
    const fraccion = Math.min(1, Math.max(0, yProyectada / Math.max(1, caja.height)));
    setPos({ lado, fraccion });
    await guardarAjuste(CLAVE_MASCOTA_POS, `${lado}:${fraccion.toFixed(3)}`);

    // Punto de reposo en píxeles, calculado igual que el calc() del estilo
    // estático, para animar hacia el mismo lugar exacto donde va a quedar.
    const estilo = getComputedStyle(elemento);
    const zonaAlta = parseFloat(estilo.getPropertyValue("--zona-alta")) || 12;
    const zonaBaja = parseFloat(estilo.getPropertyValue("--zona-baja")) || 84;
    const altoDisponible = Math.max(0, caja.height - zonaAlta - zonaBaja - TAMANO);
    const xFinal = lado === "izq" ? 12 : caja.width - 12 - TAMANO;
    const yFinal = zonaAlta + altoDisponible * fraccion;

    setAsentando(true);
    const transicion = sinMovimiento
      ? { duration: 0.2 }
      : { type: "spring" as const, bounce: 0.2, duration: 0.5 };
    animate(x, xFinal, { ...transicion, velocity: sinMovimiento ? 0 : vx });
    animate(y, yFinal, {
      ...transicion,
      velocity: sinMovimiento ? 0 : vy,
      onComplete: () => setAsentando(false),
    });
  };

  const alPresionar = (e: React.PointerEvent) => {
    e.preventDefault();
    inicio.current = { x: e.clientX, y: e.clientY, movido: false };
    const rect = nodo.current?.getBoundingClientRect();
    desplaz.current = rect
      ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
      : { x: TAMANO / 2, y: TAMANO / 2 };
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    window.addEventListener("pointercancel", alSoltar);
  };

  const flotando = arrastrando || asentando;

  return (
    <motion.div
      ref={nodo}
      onPointerDown={alPresionar}
      role="button"
      tabIndex={0}
      aria-label={`Mascota · ${racha?.dias ?? 0} días de racha`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onAbrir();
      }}
      style={{
        position: "absolute",
        width: TAMANO,
        // Más alta que ancha: las orejas cuentan.
        height: ALTO,
        zIndex: 30,
        cursor: "grab",
        touchAction: "none",
        ...(flotando
          ? { left: x, top: y }
          : {
              [pos.lado === "izq" ? "left" : "right"]: 12,
              top: `calc(var(--zona-alta) + (100% - var(--zona-alta) - var(--zona-baja) - ${TAMANO}px) * ${pos.fraccion})`,
            }),
      }}
    >
      {/* La cabeza es la burbuja: su propia silueta, con las orejas fuera. El
          progreso de la sesión recorre el contorno del cráneo. */}
      <div style={{ pointerEvents: "none" }}>
        <CabezaHusky size={TAMANO} piezas={puestas} progreso={progresoSesion} />
      </div>
    </motion.div>
  );
}
