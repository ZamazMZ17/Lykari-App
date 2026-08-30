import { db } from "../db/db";
import { configuracionIA } from "./ajustes";
import { aBase64, aWavMono16k } from "./audio";
import { ErrorIA, pedirJSON } from "./gemini";
import { ESQUEMA_SESION, PROMPT_SESION, type RespuestaSesion } from "./prompts";

/**
 * Transcribe el audio ya guardado de una sesión cerrada. Nunca borra el audio:
 * si falla, el error queda escrito y `audioPendiente` sigue en `true` para
 * poder reintentar — el mismo contrato que `procesarCaptura` (CLAUDE.md §5,
 * "el audio se guarda antes de llamar a nada").
 */
export async function procesarSesion(id: number): Promise<void> {
  const s = await db.sesiones.get(id);
  if (!s || !s.audioBlob) return;

  const config = await configuracionIA();
  if (!config.apiKey) {
    await db.sesiones.update(id, { error: "Falta la API key." });
    throw new ErrorIA("Falta la API key.");
  }

  try {
    const audio = {
      base64: await aBase64(await aWavMono16k(s.audioBlob)),
      mimeType: "audio/wav",
    };
    const r = await pedirJSON<RespuestaSesion>(config, {
      prompt: PROMPT_SESION,
      esquema: ESQUEMA_SESION,
      audio,
    });
    const transcripcion = (r.transcripcion ?? "").trim();
    await db.sesiones.update(id, {
      transcripcion: transcripcion || s.transcripcion,
      audioPendiente: false,
      error: undefined,
    });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Falló el procesamiento.";
    await db.sesiones.update(id, { error: mensaje });
    throw e;
  }
}

/**
 * Reintenta todas las sesiones que quedaron con audio grabado sin transcribir
 * — porque no había key, o porque el proveedor falló. Se llama al arrancar la
 * app, igual que `procesarPendientes` para las capturas.
 */
export async function procesarSesionesPendientes(): Promise<{ hechas: number; fallidas: number }> {
  const config = await configuracionIA();
  if (!config.apiKey) return { hechas: 0, fallidas: 0 };

  // `audioPendiente` no es un índice de Dexie (son pocas sesiones al día;
  // no hace falta uno), así que se filtra en JS sobre la tabla completa.
  const pendientes = (await db.sesiones.toArray()).filter(
    (s) => s.audioPendiente && s.audioBlob && !s.transcripcion,
  );
  let hechas = 0;
  let fallidas = 0;
  for (const s of pendientes.sort((a, b) => a.inicio - b.inicio)) {
    try {
      await procesarSesion(s.id!);
      hechas++;
    } catch {
      fallidas++;
      // Un fallo de cuota o de red hará fallar al resto igual: no insistimos.
      break;
    }
  }
  return { hechas, fallidas };
}
