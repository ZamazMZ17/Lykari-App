import pkg from "../../package.json";

/** De dónde sale el APK: se publica como release en este repositorio. */
export const REPO_OWNER = "zamazmz17";
export const REPO_NAME = "lykari-app";

export const APP_VERSION: string = pkg.version;

export type EstadoActualizacion =
  | { estado: "revisando" }
  | { estado: "al-dia" }
  | { estado: "disponible"; version: string; url: string }
  | { estado: "sin-releases" }
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
 * Consulta el último release público del repo. No hace falta token: los
 * releases son públicos y la API de GitHub los sirve sin autenticación.
 */
export async function buscarActualizacion(): Promise<EstadoActualizacion> {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    );
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
