import pkg from "../../package.json";

/** De dónde sale el APK: se publica como release en este repositorio. */
export const REPO_OWNER = "zamazmz17";
export const REPO_NAME = "lykari-app";

export const APP_VERSION: string = pkg.version;

export type EstadoActualizacion =
  | { estado: "revisando" }
  | { estado: "al-dia" }
  /** URL directa del APK del release. En Android se descarga dentro de
   * Lykari; en la versión web se abre normalmente en otra pestaña. */
  | { estado: "disponible"; version: string; assetUrl: string }
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
 * Consulta el último release público. No se pide ninguna clave al usuario:
 * consultar una actualización no debe dar acceso al repositorio ni convertir
 * Ajustes en una pantalla técnica.
 */
export async function buscarActualizacion(): Promise<EstadoActualizacion> {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (resp.status === 404) return { estado: "sin-releases" };
    if (!resp.ok) return { estado: "error" };
    const data = await resp.json();
    const version = String(data.tag_name ?? "").replace(/^v/, "");
    const apk = Array.isArray(data.assets)
      ? data.assets.find((asset: unknown) =>
        typeof asset === "object" && asset !== null && (asset as { name?: unknown }).name === "Lykari.apk",
      ) as { browser_download_url?: unknown } | undefined
      : undefined;
    const assetUrl = typeof apk?.browser_download_url === "string" ? apk.browser_download_url : "";
    if (!version || !assetUrl) return { estado: "error" };
    return compararVersiones(version, APP_VERSION) > 0
      ? { estado: "disponible", version, assetUrl }
      : { estado: "al-dia" };
  } catch {
    return { estado: "error" };
  }
}
