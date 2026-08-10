import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { CLAVE_TEMA, guardarAjuste, leerAjuste } from "../ia/ajustes";
import { esNativo } from "./plataforma";

export type Tema = "claro" | "oscuro" | "sistema";
export type TemaEfectivo = "claro" | "oscuro";

export const TEMA_POR_DEFECTO: Tema = "sistema";

/** El color de fondo de cada tema, para la barra de estado y el meta. */
const FONDO = { claro: "#DCE0D9", oscuro: "#12160F" };

const consultaOscuro = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function resolver(tema: Tema): TemaEfectivo {
  if (tema === "sistema") return consultaOscuro() ? "oscuro" : "claro";
  return tema;
}

/**
 * Estampa el tema en el DOM y, en el APK, ajusta la barra de estado del sistema
 * para que el reloj se lea. Con fondo claro los iconos van oscuros; con fondo
 * oscuro, claros. Por defecto Android los pinta según el tema del theme XML, y
 * sin esto el reloj quedaría invisible al cambiar de modo.
 */
async function aplicar(efectivo: TemaEfectivo): Promise<void> {
  const raiz = document.documentElement;
  raiz.setAttribute("data-theme", efectivo === "oscuro" ? "dark" : "light");

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", FONDO[efectivo]);

  if (!esNativo) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Dark = contenido oscuro (para fondo claro); Style.Light = contenido
    // claro (para fondo oscuro). El nombre va al revés de lo que uno esperaría.
    await StatusBar.setStyle({ style: efectivo === "oscuro" ? Style.Light : Style.Dark });
  } catch {
    /* plugin ausente en web */
  }
}

export function guardarTema(tema: Tema): Promise<void> {
  return guardarAjuste(CLAVE_TEMA, tema);
}

/**
 * Aplica el tema guardado y lo mantiene en sync: si es «sistema», sigue los
 * cambios del sistema operativo en vivo.
 */
export function useTema(): { tema: Tema; efectivo: TemaEfectivo } {
  const guardado = useLiveQuery(() => leerAjuste(CLAVE_TEMA), []);
  const tema = (guardado as Tema | undefined) ?? TEMA_POR_DEFECTO;
  const [efectivo, setEfectivo] = useState<TemaEfectivo>(() => resolver(tema));

  useEffect(() => {
    const actual = resolver(tema);
    setEfectivo(actual);
    void aplicar(actual);

    if (tema !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => {
      const nuevo = resolver("sistema");
      setEfectivo(nuevo);
      void aplicar(nuevo);
    };
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, [tema]);

  return { tema, efectivo };
}
