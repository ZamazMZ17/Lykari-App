import { configuracionSync } from "./cliente";
import { esNativo } from "../lib/plataforma";

interface RespuestaSam {
  respuesta?: unknown;
  error?: unknown;
  detail?: unknown;
}

function validarConexion(url: string, token: string): void {
  if (!url || !token) throw new Error("Conecta tu laptop en Ajustes antes de escribirle a Sam.");
  if (!/^https?:\/\//.test(url)) throw new Error("La dirección de Sam debe empezar por http:// o https://.");
  if (esNativo && !/^https:\/\//.test(url)) {
    throw new Error("En Android, Sam necesita una dirección HTTPS.");
  }
}

async function detalle(respuesta: Response): Promise<string> {
  try {
    const datos = await respuesta.json() as RespuestaSam;
    return typeof datos.error === "string" ? datos.error : typeof datos.detail === "string" ? datos.detail : "";
  } catch {
    return "";
  }
}

/** Envía una indicación al Sam de la laptop usando el mismo puente privado de Lykari. */
export async function enviarIndicacionASam(texto: string): Promise<string> {
  const config = await configuracionSync();
  validarConexion(config.url, config.token);
  try {
    const respuesta = await fetch(`${config.url}/v1/assistant/commands`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texto }),
    });
    if (!respuesta.ok) {
      const mensaje = await detalle(respuesta);
      if (respuesta.status === 401) throw new Error("Llegué a la laptop, pero la clave no coincide.");
      if (respuesta.status === 409) throw new Error(mensaje || "Sam está atendiendo otra indicación. Espera a que termine.");
      if (respuesta.status === 404) throw new Error("Sam de la laptop aún no tiene el Asistente de Lykari. Actualiza Sam e inténtalo de nuevo.");
      if (respuesta.status === 400) throw new Error(mensaje || "Revisa la indicación e inténtalo de nuevo.");
      throw new Error(mensaje || "Sam no pudo completar esta indicación.");
    }
    const datos = await respuesta.json() as RespuestaSam;
    if (typeof datos.respuesta !== "string" || !datos.respuesta.trim()) {
      throw new Error("Sam respondió sin un mensaje legible. Inténtalo de nuevo.");
    }
    return datos.respuesta;
  } catch (error) {
    if (error instanceof Error && error.name !== "TypeError") throw error;
    throw new Error("No encuentro la laptop. Abre Sam y Tailscale en ambos equipos.");
  }
}
