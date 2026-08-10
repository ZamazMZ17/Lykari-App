import { useEffect, useRef, useState } from "react";

/**
 * Re-render periódico mientras algo corre. El tiempo nunca se acumula aquí:
 * esto solo pide repintar, el valor se recalcula desde las marcas guardadas.
 */
export function useTic(activo: boolean, ms = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(t);
  }, [activo, ms]);
  return ahora;
}

/** Avisa cuando la app vuelve al frente (salir de segundo plano, desbloquear). */
export function useAlVolver(fn: () => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const alCambiar = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    document.addEventListener("visibilitychange", alCambiar);
    window.addEventListener("focus", alCambiar);
    return () => {
      document.removeEventListener("visibilitychange", alCambiar);
      window.removeEventListener("focus", alCambiar);
    };
  }, []);
}

/**
 * Dos disposiciones, no un continuo:
 *
 * - `compacta` — celular y tablet en vertical estrecha. Navegación abajo,
 *   una columna, una pantalla a la vez.
 * - `amplia` — tablet. Navegación en un riel a la izquierda, contenido en
 *   varias columnas y las secciones de Capturar al lado de su lista, sin
 *   tener que entrar y volver.
 *
 * El corte está donde una sola columna empieza a desperdiciar la pantalla.
 */
export type Disposicion = "compacta" | "amplia";

const CORTE_AMPLIA = 720;

export function useDisposicion(): Disposicion {
  const [ancha, setAncha] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= CORTE_AMPLIA,
  );
  useEffect(() => {
    const consulta = window.matchMedia(`(min-width: ${CORTE_AMPLIA}px)`);
    const alCambiar = () => setAncha(consulta.matches);
    alCambiar();
    // El evento de la media query no siempre llega al girar la tablet o al
    // entrar en pantalla dividida. `resize` sí, y recalcular es barato.
    consulta.addEventListener("change", alCambiar);
    window.addEventListener("resize", alCambiar);
    window.addEventListener("orientationchange", alCambiar);
    return () => {
      consulta.removeEventListener("change", alCambiar);
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("orientationchange", alCambiar);
    };
  }, []);
  return ancha ? "amplia" : "compacta";
}

/* ── botón atrás de Android ──────────────────────────────────────── */

/**
 * Pila única de capas abiertas (sesión, hojas). El atrás del teléfono cierra
 * solo la de arriba en vez de salir de la app. Con una pila compartida evitamos
 * que dos capas abiertas reaccionen al mismo toque.
 */
type Capa = { id: number; cerrar: () => void };
const pila: Capa[] = [];
let escuchando = false;
let ignorarPops = 0;

function alPop() {
  if (ignorarPops > 0) {
    ignorarPops--;
    return;
  }
  const arriba = pila.pop();
  arriba?.cerrar();
}

let secuencia = 0;

export function useAtras(abierto: boolean, cerrar: () => void): void {
  const ref = useRef(cerrar);
  ref.current = cerrar;

  useEffect(() => {
    if (!abierto) return;
    if (!escuchando) {
      window.addEventListener("popstate", alPop);
      escuchando = true;
    }
    const capa: Capa = { id: ++secuencia, cerrar: () => ref.current() };
    pila.push(capa);
    history.pushState({ capa: capa.id }, "");

    return () => {
      const i = pila.indexOf(capa);
      if (i === -1) return; // ya la cerró el propio atrás del teléfono
      pila.splice(i, 1);
      // Se cerró desde la interfaz: hay que consumir la entrada que empujamos,
      // sin que ese retroceso cierre además la capa de abajo.
      ignorarPops++;
      history.back();
    };
  }, [abierto]);
}
