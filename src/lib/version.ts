import pkg from "../../package.json";
import { CLAVE_GH_TOKEN, leerAjuste } from "../ia/ajustes";

/** De dónde sale el APK: se publica como release en este repositorio. */
export const REPO_OWNER = "zamazmz17";
export const REPO_NAME = "lykari-app";

export const APP_VERSION: string = pkg.version;

export type EstadoActualizacion =
  | { estado: "revisando" }
  | { estado: "al-dia" }
  | { estado: "disponible"; version: string; url: string }
  | { estado: "sin-releases" }
  | { estado: "sin-token" }
  | { estado: "token-invalido" }
  | { estado: "error" };

/** Compara "1.2.0" contra "1.10.0" por partes, no como texto. */
function compararVersiones(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/**
 * Consulta el último release del repo. El repo es privado (CLAUDE.md: la app
 * es de un solo usuario, sin publicar), así que la API de GitHub nunca lo
 * sirve sin autenticación — sin token, cualquier pedido devuelve 404 aunque
 * sí haya releases. Por eso este chequeo nunca funcionó: faltaba mandar un
 * token. Se guarda en el dispositivo igual que la key de la IA (src/ia/ajustes.ts),
 * nunca en el código ni en el repo.
 */
export async function buscarActualizacion(): Promise<EstadoActualizacion> {
  const token = await leerAjuste(CLAVE_GH_TOKEN);
  if (!token) return { estado: "sin-token" };
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
    );
    if (resp.status === 401 || resp.status === 403) return { estado: "token-invalido" };
    if (resp.status === 404) return { estado: "sin-releases" };
    if (!resp.ok) return { estado: "error" };
    const data = await resp.json();
    const version = String(data.tag_name ?? "").replace(/^v/, "");
    const url = typeof data.html_url === "string" ? data.html_url : "";
    if (!version || !url) return { estado: "error" };
    return compararVersiones(version, APP_VERSION) > 0
      ? { estado: "disponible", version, url }
      : { estado: "al-dia" };
  } catch {
    return { estado: "error" };
  }
}
