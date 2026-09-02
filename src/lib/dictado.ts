import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface DictadoPlugin {
  disponible(): Promise<{ valor: boolean }>;
  iniciar(): Promise<void>;
  detener(): Promise<void>;
  cancelar(): Promise<void>;
  addListener(
    eventName: "parcial" | "final" | "error",
    listener: (data: { texto?: string; codigo?: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const Dictado = registerPlugin<DictadoPlugin>("Dictado");

/** Si el reconocedor no contesta en este tiempo, seguimos con lo último que
 *  se escuchó — nunca se traba la app esperando al nativo. */
const ESPERA_MAXIMA_MS = 4000;

/**
 * Dictado nativo de Android (SpeechRecognizer) en paralelo a la grabación:
 * transcribe en el momento, sin mandarle el audio a Gemini. Es un atajo, no
 * un reemplazo — el audio grabado sigue siendo la fuente de verdad; si el
 * dictado falla o el dispositivo no tiene servicio de reconocimiento, la
 * captura queda igual de a salvo y Gemini transcribe el audio como antes
 * (ver `dictadoDisponible` y el chequeo en cada llamador).
 *
 * El plugin nativo ya encadena tramos solo (una pausa larga no corta el
 * dictado a la mitad si seguís hablando) y junta todo antes de avisar
 * "final" — acá solo se escucha el resultado, no se arma nada.
 */
export function useDictado() {
  const [textoEnVivo, setTextoEnVivo] = useState("");
  const ultimoTexto = useRef("");
  const resolverFinal = useRef<((texto: string) => void) | null>(null);

  useEffect(() => {
    const escuchas = [
      Dictado.addListener("parcial", (d: { texto?: string }) => {
        ultimoTexto.current = d.texto ?? "";
        setTextoEnVivo(ultimoTexto.current);
      }),
      Dictado.addListener("final", (d: { texto?: string }) => {
        ultimoTexto.current = d.texto ?? "";
        setTextoEnVivo(ultimoTexto.current);
        resolverFinal.current?.(ultimoTexto.current);
        resolverFinal.current = null;
      }),
      // Un error del reconocedor (sin servicio, sin red si lo necesita, etc.)
      // no puede colgar el guardado: se sigue con lo que se haya escuchado.
      Dictado.addListener("error", () => {
        resolverFinal.current?.(ultimoTexto.current);
        resolverFinal.current = null;
      }),
    ];
    return () => {
      for (const p of escuchas) void p.then((h: PluginListenerHandle) => h.remove());
    };
  }, []);

  const iniciar = useCallback(() => {
    ultimoTexto.current = "";
    setTextoEnVivo("");
    void Dictado.iniciar();
  }, []);

  /** Se resuelve con el texto final (puede ser ""). */
  const detener = useCallback((): Promise<string> => {
    void Dictado.detener();
    return new Promise((resolve) => {
      resolverFinal.current = resolve;
      setTimeout(() => {
        if (resolverFinal.current === resolve) {
          resolverFinal.current = null;
          resolve(ultimoTexto.current);
        }
      }, ESPERA_MAXIMA_MS);
    });
  }, []);

  const cancelar = useCallback(() => {
    resolverFinal.current = null;
    ultimoTexto.current = "";
    setTextoEnVivo("");
    void Dictado.cancelar();
  }, []);

  return { textoEnVivo, iniciar, detener, cancelar };
}

export async function dictadoDisponible(): Promise<boolean> {
  try {
    const { valor } = await Dictado.disponible();
    return valor;
  } catch {
    return false;
  }
}
