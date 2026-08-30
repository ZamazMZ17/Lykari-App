import type { ConfigIA } from "./ajustes";
import { LIMITE_INLINE_BYTES } from "./audio";

/**
 * Transporte, nada más. Los prompts viven en `prompts.ts` y el orquestador en
 * `procesar.ts`, para que cambiar de proveedor toque solo este archivo.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Subconjunto de JSON Schema que acepta `responseSchema`. */
export interface Esquema {
  type: "object" | "array" | "string" | "number" | "boolean" | "integer";
  properties?: Record<string, Esquema>;
  items?: Esquema;
  required?: string[];
  nullable?: boolean;
  description?: string;
  propertyOrdering?: string[];
}

export interface Audio {
  base64: string;
  mimeType: string;
}

export class ErrorIA extends Error {
  constructor(
    message: string,
    readonly estado?: number,
  ) {
    super(message);
    this.name = "ErrorIA";
  }
}

function mensajeDeError(estado: number, cuerpo: unknown): string {
  const detalle =
    typeof cuerpo === "object" && cuerpo !== null && "error" in cuerpo
      ? ((cuerpo as { error?: { message?: string } }).error?.message ?? "")
      : "";
  if (estado === 400 && /API key not valid/i.test(detalle))
    return "La API key no es válida. Revísala en Ajustes.";
  if (estado === 403) return "La API key no tiene permiso para este modelo.";
  if (estado === 404) return "Ese modelo no existe o no está disponible para tu key.";
  if (estado === 429) return "Se acabó la cuota por ahora. Vuelve a intentarlo más tarde.";
  if (estado === 503)
    return "El modelo está saturado ahora mismo. Se reintenta solo al volver a abrir la app.";
  // Sin mencionar el audio: por aquí pasan también los cierres del día, que
  // son solo texto.
  if (estado >= 500) return "El proveedor está fallando. Nada se perdió; se reintenta luego.";
  return detalle || `Error ${estado} del proveedor.`;
}

/**
 * Una llamada, respuesta en JSON validada contra `esquema`.
 * `audio` es opcional: en la fase 3 el cierre del día manda solo texto.
 */
/** Saturación o corte momentáneo: reintentar una vez suele bastar. */
const PASAJERO = new Set([429, 500, 502, 503, 504]);
const ESPERA_REINTENTO = 4000;

export async function pedirJSON<T>(
  config: ConfigIA,
  opciones: { prompt: string; esquema: Esquema; audio?: Audio; senal?: AbortSignal },
): Promise<T> {
  try {
    return await intentar<T>(config, opciones);
  } catch (e) {
    if (!(e instanceof ErrorIA) || !e.estado || !PASAJERO.has(e.estado)) throw e;
    await new Promise((r) => setTimeout(r, ESPERA_REINTENTO));
    return intentar<T>(config, opciones);
  }
}

async function intentar<T>(
  config: ConfigIA,
  opciones: { prompt: string; esquema: Esquema; audio?: Audio; senal?: AbortSignal },
): Promise<T> {
  if (!config.apiKey) throw new ErrorIA("Falta la API key.");

  const partes: unknown[] = [];
  if (opciones.audio) {
    // Sin esto, un audio muy largo salía como un error genérico del servidor
    // y no había forma de saber que el problema era el tamaño.
    if (opciones.audio.base64.length > LIMITE_INLINE_BYTES) {
      throw new ErrorIA("El audio es demasiado largo para enviarlo de una vez. Queda guardado.");
    }
    partes.push({
      inline_data: { mime_type: opciones.audio.mimeType, data: opciones.audio.base64 },
    });
  }
  partes.push({ text: opciones.prompt });

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}/${config.modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: partes }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: opciones.esquema,
          temperature: 0.4,
        },
      }),
      signal: opciones.senal,
    });
  } catch {
    // Sin afirmar la causa: aquí cae tanto la falta de red como una petición
    // que se corta porque la app se cerró en mitad. Y sin mencionar el audio,
    // que por esta función pasan también los cierres del día.
    throw new ErrorIA("La llamada no llegó a completarse. Nada se perdió; se reintenta luego.", 0);
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new ErrorIA(mensajeDeError(respuesta.status, cuerpo), respuesta.status);
  }

  const datos = (await respuesta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };

  const candidato = datos.candidates?.[0];
  const texto = candidato?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!texto.trim()) {
    throw new ErrorIA(
      candidato?.finishReason === "MAX_TOKENS"
        ? "La respuesta se cortó por longitud."
        : "El proveedor no devolvió nada.",
    );
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErrorIA("El proveedor devolvió algo que no es JSON.");
  }
}
