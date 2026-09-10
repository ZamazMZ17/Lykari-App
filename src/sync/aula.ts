import { configuracionSync } from "./cliente";
import { estadoAula, importarFeedAula, type FeedAulaUPC } from "../db/aula";
import { esNativo } from "../lib/plataforma";

function validar(url: string, token: string) {
  if (!url || !token) throw new Error("Conecta primero la laptop en Ajustes.");
  if (esNativo && !url.startsWith("https://")) throw new Error("La app Android necesita HTTPS para consultar el aula.");
}

function headers(token: string, revision?: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(revision ? { "If-None-Match": revision } : {}),
  };
}

/** Trae la copia ya revisada por Sam. Si no cambió, mantiene intacta la base local. */
export async function actualizarAulaUPC(): Promise<{ cambio: boolean; revision?: string }> {
  const config = await configuracionSync();
  validar(config.url, config.token);
  const local = await estadoAula();
  const respuesta = await fetch(`${config.url}/v1/academic/feed`, { headers: headers(config.token, local.revision === "0" ? undefined : local.revision) });
  if (respuesta.status === 304) return { cambio: false, revision: local.revision };
  if (!respuesta.ok) throw new Error(respuesta.status === 401 ? "La clave de sincronización no coincide." : "No se pudo consultar el aula desde la laptop.");
  const feed = await respuesta.json() as FeedAulaUPC;
  await importarFeedAula(feed);
  return { cambio: true, revision: String(feed.revision) };
}

/** El gesto explícito revisa la fuente en Sam y luego guarda el resultado localmente. */
export async function revisarAulaUPC(): Promise<{ cambio: boolean; revision?: string }> {
  const config = await configuracionSync();
  validar(config.url, config.token);
  const respuesta = await fetch(`${config.url}/v1/academic/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!respuesta.ok) throw new Error(respuesta.status === 401 ? "La clave de sincronización no coincide." : "Sam no pudo revisar el aula ahora.");
  const feed = await respuesta.json() as FeedAulaUPC;
  await importarFeedAula(feed);
  return { cambio: true, revision: String(feed.revision) };
}

/** Pide a Sam abrir su perfil UPC; la contraseña se escribe solo en esa ventana local. */
export async function abrirSesionUPCEnLaptop(): Promise<string> {
  const config = await configuracionSync();
  validar(config.url, config.token);
  const respuesta = await fetch(`${config.url}/v1/academic/session`, {
    method: "POST", headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!respuesta.ok) throw new Error("No se pudo abrir la sesión UPC en la laptop.");
  const datos = await respuesta.json() as { mensaje?: string };
  return datos.mensaje ?? "Abrí la sesión UPC en la laptop.";
}
