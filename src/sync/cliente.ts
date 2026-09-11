import {
  construirRespaldo,
  leerRespaldo,
  restaurarRespaldo,
  serializarRespaldo,
} from "../exportar/respaldo";
import { guardarAjuste, leerAjuste } from "../ia/ajustes";
import { esNativo } from "../lib/plataforma";

/** Los secretos de IA nunca entran en este contrato ni en el puente. */
export const CLAVE_SYNC_URL = "syncUrl";
export const CLAVE_SYNC_TOKEN = "syncToken";
export const CLAVE_SYNC_REVISION = "syncRevision";
export const CLAVE_SYNC_ULTIMA = "syncUltima";

export interface ConfigSync {
  url: string;
  token: string;
  revision: string;
  ultimaSincronizacion: string;
}

export interface EstadoConexionLaptop {
  laptop: "ok";
  snapshot: { exists: boolean; revision: number };
  academic: { revision: number; sources: Record<string, unknown> };
}

export type ResultadoConexionInicial =
  | { tipo: "copia-inicial"; estado: EstadoConexionLaptop; revision: string }
  | { tipo: "ya-conectada"; estado: EstadoConexionLaptop }
  | { tipo: "copia-existente"; estado: EstadoConexionLaptop };

/**
 * La dirección que muestra Tailscale normalmente termina en `.ts.net`, pero
 * la API vive bajo este prefijo. Completarlo aquí evita que el usuario tenga
 * que recordar una ruta técnica al enlazar un teléfono nuevo.
 */
function normalizarUrlSync(valor: string): string {
  const limpia = valor.trim().replace(/\/$/, "");
  if (!limpia) return "";
  try {
    const url = new URL(limpia);
    // El 8585 es donde Sam escucha dentro de la laptop. Tailscale Serve lo
    // publica por HTTPS estándar (443); versiones anteriores de la guía
    // sugerían conservar ese puerto y el teléfono intentaba hablar TLS con
    // un servidor HTTP. Corregirlo aquí recupera instalaciones ya guardadas.
    if (url.protocol === "https:" && /\.ts\.net$/i.test(url.hostname) && url.port === "8585") {
      url.port = "";
    }
    if (!url.pathname || url.pathname === "/") url.pathname = "/api/lykari";
    return url.toString().replace(/\/$/, "");
  } catch {
    return limpia;
  }
}

export async function configuracionSync(): Promise<ConfigSync> {
  const [url, token, revision, ultimaSincronizacion] = await Promise.all([
    leerAjuste(CLAVE_SYNC_URL),
    leerAjuste(CLAVE_SYNC_TOKEN),
    leerAjuste(CLAVE_SYNC_REVISION),
    leerAjuste(CLAVE_SYNC_ULTIMA),
  ]);
  return {
    url: normalizarUrlSync(url ?? ""), token: token ?? "", revision: revision ?? "0",
    ultimaSincronizacion: ultimaSincronizacion ?? "",
  };
}

export async function guardarConfiguracionSync(url: string, token: string): Promise<void> {
  await Promise.all([
    guardarAjuste(CLAVE_SYNC_URL, normalizarUrlSync(url)),
    guardarAjuste(CLAVE_SYNC_TOKEN, token),
  ]);
}

function encabezados(config: ConfigSync): HeadersInit {
  return {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  };
}

function validar(config: ConfigSync): void {
  if (!config.url || !config.token) throw new Error("Agrega la dirección y la clave de tu laptop.");
  if (!/^https?:\/\//.test(config.url)) throw new Error("La dirección debe empezar por http:// o https://.");
  if (esNativo && !/^https:\/\//.test(config.url)) {
    throw new Error("En la app Android usa una dirección HTTPS para proteger tu registro.");
  }
}

async function cuerpoError(respuesta: Response): Promise<string> {
  try {
    const datos = await respuesta.json() as { error?: unknown; detail?: unknown };
    return typeof datos.error === "string" ? datos.error : typeof datos.detail === "string" ? datos.detail : "";
  } catch {
    return "";
  }
}

async function mensajeError(respuesta: Response, contexto: "conexion" | "enviar" | "traer"): Promise<string> {
  const detalle = await cuerpoError(respuesta);
  if (respuesta.status === 401) return "Llegué a la laptop, pero la clave no coincide.";
  if (respuesta.status === 412) return "La copia de laptop cambió. Elige traerla antes de reemplazarla.";
  if (respuesta.status === 413) return "La copia es demasiado grande para enviarla ahora.";
  if (respuesta.status === 404 && detalle === "sync_empty" && contexto === "traer") {
    return "Aún no existe una copia en la laptop. Usa Guardar y conectar primero.";
  }
  if (respuesta.status === 404 && contexto === "conexion") {
    return "La dirección no corresponde a Sam. Pega la dirección HTTPS que muestra Tailscale.";
  }
  if (respuesta.status === 400 && detalle) return detalle;
  return "Sam respondió, pero no pudo completar esta acción. Reinicia Sam e inténtalo de nuevo.";
}

function errorDeRed(error: unknown): Error {
  // `fetch` usa TypeError para DNS, TLS y falta de red. Los demás errores ya
  // son diagnósticos construidos por Lykari y deben llegar tal cual a la UI.
  if (error instanceof Error && error.name !== "TypeError") return error;
  return new Error("No encuentro la laptop. Abre Tailscale en ambos equipos y confirma que usan la misma cuenta.");
}

/** Consulta estado de respaldo y académico sin modificar el teléfono ni Sam. */
export async function estadoConexionLaptop(): Promise<EstadoConexionLaptop> {
  const config = await configuracionSync();
  validar(config);
  try {
    const respuesta = await fetch(`${config.url}/v1/connection`, { headers: encabezados(config) });
    if (!respuesta.ok) throw new Error(await mensajeError(respuesta, "conexion"));
    const estado = await respuesta.json() as EstadoConexionLaptop;
    if (estado.laptop !== "ok" || !estado.snapshot) throw new Error("Sam devolvió un estado de conexión incompleto.");
    return estado;
  } catch (error) {
    throw errorDeRed(error);
  }
}

/** Mantiene la revisión conocida y, solo tras una copia real, su fecha. */
async function guardarRevision(revision: string, sincronizada: boolean): Promise<void> {
  await guardarAjuste(CLAVE_SYNC_REVISION, revision);
  if (sincronizada) await guardarAjuste(CLAVE_SYNC_ULTIMA, new Date().toISOString());
}

/** El usuario conserva el teléfono por ahora, pero reconoce qué copia remota existe. */
export async function conservarDatosDeEsteTelefono(revisionRemota: number): Promise<void> {
  await guardarRevision(String(revisionRemota), false);
}

/**
 * Punto de entrada del enlace inicial. Una laptop sin copia recibe el respaldo
 * automáticamente. Una laptop con datos devuelve una decisión, nunca un
 * reemplazo implícito.
 */
export async function guardarYConectar(url: string, token: string): Promise<ResultadoConexionInicial> {
  const anterior = await configuracionSync();
  await guardarConfiguracionSync(url, token);
  const actual = await configuracionSync();
  const estado = await estadoConexionLaptop();
  if (!estado.snapshot.exists) {
    await guardarRevision("0", false);
    const revision = await enviarALaptop();
    return {
      tipo: "copia-inicial",
      estado: { ...estado, snapshot: { exists: true, revision: Number(revision) } },
      revision,
    };
  }
  const mismaConexion = anterior.url === actual.url && anterior.token === actual.token
    && anterior.revision === String(estado.snapshot.revision);
  return mismaConexion ? { tipo: "ya-conectada", estado } : { tipo: "copia-existente", estado };
}

/** Comprueba URL, Tailscale y clave sin copiar ni reemplazar registros. */
export async function probarConexionLaptop(): Promise<EstadoConexionLaptop> {
  return estadoConexionLaptop();
}

/**
 * Sube una instantánea únicamente si esta app conoce la revisión actual.
 * Así dos dispositivos nunca se pisan en silencio: se trae la otra copia y
 * se vuelve a enviar desde un punto común.
 */
export async function enviarALaptop(): Promise<string> {
  const config = await configuracionSync();
  validar(config);
  const respaldo = await construirRespaldo();
  const respuesta = await fetch(`${config.url}/v1/snapshot`, {
    method: "PUT",
    headers: { ...encabezados(config), "If-Match": config.revision || "0" },
    body: serializarRespaldo(respaldo),
  });
  if (!respuesta.ok) throw new Error(await mensajeError(respuesta, "enviar"));
  const datos = (await respuesta.json()) as { revision?: number };
  const revision = String(datos.revision ?? respuesta.headers.get("x-lykari-revision") ?? "0");
  await guardarRevision(revision, true);
  return revision;
}

/** Descarga y reemplaza el registro local solo después de validar la copia. */
export async function traerDeLaptop(): Promise<string> {
  const config = await configuracionSync();
  validar(config);
  const respuesta = await fetch(`${config.url}/v1/snapshot`, { headers: encabezados(config) });
  if (!respuesta.ok) throw new Error(await mensajeError(respuesta, "traer"));
  const texto = await respuesta.text();
  const { respaldo } = leerRespaldo(texto);
  await restaurarRespaldo(respaldo);
  const revision = respuesta.headers.get("x-lykari-revision") ?? "0";
  await guardarRevision(revision, true);
  return revision;
}
