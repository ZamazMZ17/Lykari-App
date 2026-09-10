import { aBase64, aWavMono16k } from "./audio";
import { configuracionIA } from "./ajustes";
import { ErrorIA, pedirJSON } from "./gemini";

const ESQUEMA_TRANSCRIPCION = {
  type: "object" as const,
  properties: { transcripcion: { type: "string" as const } },
  required: ["transcripcion"],
};

/**
 * Transcripción breve y literal para campos que no son capturas del registro.
 * El audio nunca se guarda: la orden solo se manda a Sam después de que la
 * persona pueda leer y corregir el texto que entendió Lykari.
 */
export async function transcribirIndicacion(blob: Blob): Promise<string> {
  const config = await configuracionIA();
  if (!config.apiKey) throw new ErrorIA("Falta la API key. Agrégala en Ajustes para transcribir tu voz.");

  const audio = {
    base64: await aBase64(await aWavMono16k(blob)),
    mimeType: "audio/wav",
  };
  const respuesta = await pedirJSON<{ transcripcion?: unknown }>(config, {
    prompt: `Transcribe este audio en español. Es una indicación para un asistente de laptop.
Devuelve solo el texto que dijo la persona, limpio de muletillas repetidas.
Conserva órdenes, nombres, fechas y términos técnicos tal como se entiendan; no respondas ni ejecutes la orden.`,
    esquema: ESQUEMA_TRANSCRIPCION,
    audio,
  });
  const texto = typeof respuesta.transcripcion === "string" ? respuesta.transcripcion.trim() : "";
  if (!texto) throw new ErrorIA("No pude obtener texto de ese audio. Inténtalo de nuevo o escríbelo.");
  return texto;
}
