import { useRef, useState } from "react";

/**
 * Rejilla 3×3 para el desbloqueo por patrón. Devuelve la secuencia de nodos
 * (ej. "0-1-2-5-8") por `onCompletar` al soltar. Funciona con dedo y mouse.
 * No dibuja la ruta con colores de estado más que ámbar (nada de rojo): es el
 * mismo lenguaje de la racha.
 */
const LADO = 240;
const NODOS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const centro = (i: number) => ({
  x: (i % 3) * (LADO / 3) + LADO / 6,
  y: Math.floor(i / 3) * (LADO / 3) + LADO / 6,
});

export function PatronPad({ onCompletar }: { onCompletar: (secuencia: string) => void }) {
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [dibujando, setDibujando] = useState(false);
  const [puntero, setPuntero] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const nodoEn = (clientX: number, clientY: number): number | null => {
    const caja = ref.current?.getBoundingClientRect();
    if (!caja) return null;
    const escala = LADO / caja.width;
    const x = (clientX - caja.left) * escala;
    const y = (clientY - caja.top) * escala;
    for (const i of NODOS) {
      const c = centro(i);
      if (Math.hypot(x - c.x, y - c.y) < LADO / 9) return i;
    }
    return null;
  };

  const posicion = (clientX: number, clientY: number) => {
    const caja = ref.current?.getBoundingClientRect();
    if (!caja) return null;
    const escala = LADO / caja.width;
    return { x: (clientX - caja.left) * escala, y: (clientY - caja.top) * escala };
  };

  const empezar = (e: React.PointerEvent) => {
    e.preventDefault();
    setSeleccion([]);
    setDibujando(true);
    const n = nodoEn(e.clientX, e.clientY);
    if (n !== null) setSeleccion([n]);
  };

  const mover = (e: React.PointerEvent) => {
    if (!dibujando) return;
    setPuntero(posicion(e.clientX, e.clientY));
    const n = nodoEn(e.clientX, e.clientY);
    if (n !== null && !seleccion.includes(n)) setSeleccion((s) => [...s, n]);
  };

  const terminar = () => {
    if (!dibujando) return;
    setDibujando(false);
    setPuntero(null);
    if (seleccion.length >= 2) onCompletar(seleccion.join("-"));
    else setSeleccion([]);
  };

  return (
    <div style={{ display: "grid", placeItems: "center", margin: "4px 0 14px" }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${LADO} ${LADO}`}
        style={{ width: "min(240px, 70vw)", height: "min(240px, 70vw)", touchAction: "none" }}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
      >
        {/* Trazos entre nodos seleccionados */}
        {seleccion.map((n, i) => {
          if (i === 0) return null;
          const a = centro(seleccion[i - 1]);
          const b = centro(n);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ambar)" strokeWidth={4} strokeLinecap="round" />;
        })}
        {/* Trazo hacia el dedo */}
        {dibujando && seleccion.length > 0 && puntero && (
          <line x1={centro(seleccion[seleccion.length - 1]).x} y1={centro(seleccion[seleccion.length - 1]).y} x2={puntero.x} y2={puntero.y} stroke="var(--ambar)" strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        )}
        {/* Nodos */}
        {NODOS.map((i) => {
          const c = centro(i);
          const activo = seleccion.includes(i);
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r={LADO / 12} fill="none" stroke="var(--line)" strokeWidth={2} />
              {activo && <circle cx={c.x} cy={c.y} r={LADO / 28} fill="var(--ambar)" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
