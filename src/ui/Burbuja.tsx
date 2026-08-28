import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { CabezaHusky } from "./Husky";
import { estadoDeLaRacha, piezasDeLaSemana, estaPuesta, type PiezaKey } from "../db/mascota";
import { CLAVE_MASCOTA_OCULTA, CLAVE_MASCOTA_POS, guardarAjuste, leerAjuste } from "../ia/ajustes";
import { hoyISO } from "../lib/fecha";

const TAMANO = 56;
/** La cabeza con orejas es más alta que ancha (proporción del propio dibujo). */
const ALTO = Math.round((TAMANO * 268) / 220);
/** Por debajo de esto el gesto fue un toque, no un arrastre. */
const TOQUE_PX = 6;

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

  const [pos, setPos] = useState<Posicion>(POR_DEFECTO);
  const [arrastrando, setArrastrando] = useState(false);
  const [temporal, setTemporal] = useState<{ x: number; y: number } | null>(null);
  const nodo = useRef<HTMLDivElement>(null);
  const inicio = useRef({ x: 0, y: 0, movido: false });
  // Punto donde se agarró la burbuja, relativo a su esquina — sin esto,
  // agarrarla de cualquier punto la recentraba bajo el dedo (skill de diseño
  // Apple, §2: la manipulación directa respeta el offset de agarre).
  const desplaz = useRef({ x: TAMANO / 2, y: TAMANO / 2 });

  useEffect(() => {
    if (guardadaPos !== undefined) setPos(leerPos(guardadaPos));
  }, [guardadaPos]);

  // Escondida solo por el día en que se escondió: mañana vuelve sola.
  if (ocultaEl === hoyISO()) return null;

  const puestas = piezas.filter(estaPuesta).map((p) => p.k as PiezaKey);

  const zona = () => {
    const padre = nodo.current?.offsetParent as HTMLElement | null;
    return padre?.getBoundingClientRect() ?? null;
  };

  const alMover = (e: PointerEvent) => {
    const caja = zona();
    if (!caja) return;
    if (
      !inicio.current.movido &&
      Math.hypot(e.clientX - inicio.current.x, e.clientY - inicio.current.y) > TOQUE_PX
    ) {
      inicio.current.movido = true;
      setArrastrando(true);
    }
    if (inicio.current.movido) {
      setTemporal({
        x: e.clientX - caja.left - desplaz.current.x,
        y: e.clientY - caja.top - desplaz.current.y,
      });
    }
  };

  const alSoltar = async (e: PointerEvent) => {
    window.removeEventListener("pointermove", alMover);
    window.removeEventListener("pointerup", alSoltar);
    window.removeEventListener("pointercancel", alSoltar);

    const caja = zona();
    setArrastrando(false);
    setTemporal(null);

    if (!inicio.current.movido) {
      // Aplazado un tick: si la hoja se monta ahora mismo, el clic que sigue
      // al pointerup cae sobre el botón que acaba de aparecer bajo el dedo.
      setTimeout(onAbrir, 0);
      return;
    }
    if (!caja) return;

    const x = e.clientX - caja.left;
    const y = e.clientY - caja.top;

    // Arrastrar no esconde: para eso está el botón de la hoja. El gesto de
    // «sacarla por el borde» se disparaba solo al soltarla cerca del margen, y
    // esconder la mascota sin haberlo pedido es peor que no poder esconderla
    // con un gesto.
    const lado: Posicion["lado"] = x < caja.width / 2 ? "izq" : "der";
    const fraccion = Math.min(1, Math.max(0, y / Math.max(1, caja.height)));
    setPos({ lado, fraccion });
    await guardarAjuste(CLAVE_MASCOTA_POS, `${lado}:${fraccion.toFixed(3)}`);
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

  return (
    <div
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
        ...(temporal
          ? { left: temporal.x, top: temporal.y }
          : {
              [pos.lado === "izq" ? "left" : "right"]: 12,
              top: `calc(var(--zona-alta) + (100% - var(--zona-alta) - var(--zona-baja) - ${TAMANO}px) * ${pos.fraccion})`,
            }),
        transition: arrastrando ? "none" : "left .18s ease-out, right .18s ease-out, top .18s ease-out",
      }}
    >
      {/* La cabeza es la burbuja: su propia silueta, con las orejas fuera. El
          progreso de la sesión recorre el contorno del cráneo. */}
      <div style={{ pointerEvents: "none" }}>
        <CabezaHusky size={TAMANO} piezas={puestas} progreso={progresoSesion} />
      </div>
    </div>
  );
}
