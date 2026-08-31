import { registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { CLAVE_GH_TOKEN, leerAjuste } from "../ia/ajustes";

/**
 * Abre el instalador de paquetes de Android para un APK ya descargado.
 * Android exige que el usuario confirme la instalación aunque venga por acá
 * — es una protección del sistema, no algo que se pueda saltar.
 */
interface InstaladorPlugin {
  abrir(opciones: { ruta: string }): Promise<void>;
}

const Instalador = registerPlugin<InstaladorPlugin>("Instalador");

const NOMBRE_ARCHIVO = "lykari-actualizacion.apk";

/** ArrayBuffer → base64, en trozos para no reventar la pila con un APK grande. */
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
 * Baja el APK directo de la API de GitHub (autenticado con el token ya
 * guardado, sin depender de que el navegador tenga sesión iniciada) y abre
 * el instalador de Android. Solo tiene sentido en el APK: en la web no hay
 * nada que instalar.
 */
export async function descargarEInstalarApk(assetUrl: string): Promise<void> {
  const token = await leerAjuste(CLAVE_GH_TOKEN);
  if (!token) throw new Error("Falta el token de GitHub.");

  const resp = await fetch(assetUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/octet-stream" },
  });
  if (!resp.ok) throw new Error(`No se pudo descargar el APK (${resp.status}).`);

  const data = aBase64(await resp.arrayBuffer());
  const { uri } = await Filesystem.writeFile({
    path: NOMBRE_ARCHIVO,
    directory: Directory.Cache,
    data,
  });

  await Instalador.abrir({ ruta: uri.replace(/^file:\/\//, "") });
}
