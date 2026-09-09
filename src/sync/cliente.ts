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

export interface ConfigSync {
  url: string;
  token: string;
  revision: string;
}

export async function configuracionSync(): Promise<ConfigSync> {
  const [url, token, revision] = await Promise.all([
    leerAjuste(CLAVE_SYNC_URL),
    leerAjuste(CLAVE_SYNC_TOKEN),
    leerAjuste(CLAVE_SYNC_REVISION),
  ]);
  return { url: (url ?? "").replace(/\/$/, ""), token: token ?? "", revision: revision ?? "0" };
}

export async function guardarConfiguracionSync(url: string, token: string): Promise<void> {
  await Promise.all([
    guardarAjuste(CLAVE_SYNC_URL, url.replace(/\/$/, "")),
    guardarAjuste(CLAVE_SYNC_TOKEN, token),
  ]);
}

function encabezados(config: ConfigSync): HeadersInit {
  return {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  };
}

function mensajeError(respuesta: Response): string {
  if (respuesta.status === 401) return "La clave de sincronización no coincide.";
  if (respuesta.status === 412) return "Hay cambios remotos. Tráelos antes de enviar este dispositivo.";
  if (respuesta.status === 404) return "Todavía no hay una copia en la laptop.";
  return "No se pudo conectar con la laptop.";
}

function validar(config: ConfigSync): void {
  if (!config.url || !config.token) throw new Error("Agrega la dirección y la clave de tu laptop.");
  if (!/^https?:\/\//.test(config.url)) throw new Error("La dirección debe empezar por http:// o https://.");
  // No rebajamos la seguridad del APK con tráfico HTTP local. La copia personal
  // debe viajar cifrada, por ejemplo con HTTPS privado de Tailscale.
  if (esNativo && !/^https:\/\//.test(config.url)) {
    throw new Error("En la app Android usa una dirección HTTPS para proteger tu registro.");
  }
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
  if (!respuesta.ok) throw new Error(mensajeError(respuesta));
  const datos = (await respuesta.json()) as { revision?: number };
  const revision = String(datos.revision ?? respuesta.headers.get("x-lykari-revision") ?? "0");
  await guardarAjuste(CLAVE_SYNC_REVISION, revision);
  return revision;
}

/** Descarga y reemplaza el registro local solo después de validar la copia. */
export async function traerDeLaptop(): Promise<string> {
  const config = await configuracionSync();
  validar(config);
  const respuesta = await fetch(`${config.url}/v1/snapshot`, { headers: encabezados(config) });
  if (!respuesta.ok) throw new Error(mensajeError(respuesta));
  const texto = await respuesta.text();
  const { respaldo } = leerRespaldo(texto);
  await restaurarRespaldo(respaldo);
  const revision = respuesta.headers.get("x-lykari-revision") ?? "0";
  await guardarAjuste(CLAVE_SYNC_REVISION, revision);
  return revision;
}
