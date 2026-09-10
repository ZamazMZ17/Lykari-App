import { registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

/** Puente mínimo hacia el instalador de paquetes de Android. */
interface InstaladorPlugin {
  abrir(opciones: { ruta: string }): Promise<void>;
}

const Instalador = registerPlugin<InstaladorPlugin>("Instalador");
const NOMBRE_ARCHIVO = "lykari-actualizacion.apk";

/** ArrayBuffer → base64 en trozos para evitar superar la pila con un APK. */
function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const TROZO = 0x8000;
  let binario = "";
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario);
}

/**
 * Descarga el APK del release público dentro de Lykari y abre la pantalla de
 * instalación nativa de Android. La confirmación final siempre es del usuario
 * por seguridad; no interviene ningún navegador ni sesión de GitHub.
 */
export async function descargarEInstalarApk(url: string): Promise<void> {
  const respuesta = await fetch(url, { headers: { Accept: "application/vnd.android.package-archive" } });
  if (!respuesta.ok) throw new Error(`No se pudo descargar el APK (${respuesta.status}).`);

  const { uri } = await Filesystem.writeFile({
    path: NOMBRE_ARCHIVO,
    directory: Directory.Cache,
    data: aBase64(await respuesta.arrayBuffer()),
  });

  await Instalador.abrir({ ruta: uri.replace(/^file:\/\//, "") });
}
