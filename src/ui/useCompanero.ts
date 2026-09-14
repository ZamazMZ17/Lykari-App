import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { leerAjuste } from "../ia/ajustes";
import { hoyISO } from "../lib/fecha";

export const NOMBRE_COMPANERO = "mascotaNombre";
export const CALMA_COMPANERO = "mascotaTranquila";

export function useCompanero() {
  const nombre = useLiveQuery(() => leerAjuste(NOMBRE_COMPANERO), []);
  const calma = useLiveQuery(() => leerAjuste(CALMA_COMPANERO), []);
  const [dia, setDia] = useState(hoyISO);
  useEffect(() => {
    const actualizar = () => setDia(hoyISO());
    const reloj = window.setInterval(actualizar, 60_000);
    window.addEventListener("focus", actualizar);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      window.clearInterval(reloj);
      window.removeEventListener("focus", actualizar);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, []);
  return { nombre: nombre || "Kiro", tranquilo: calma === "1", dia };
}
