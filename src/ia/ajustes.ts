import { db } from "../db/db";

/**
 * La key vive en el dispositivo y nunca sale de aquí salvo hacia el proveedor.
 * No se publica la app con la key dentro (CLAUDE.md §3).
 */
export const CLAVE_API = "iaApiKey";
export const CLAVE_MODELO = "iaModelo";
/** Dónde dejó el usuario la burbuja de la mascota: `lado:fraccion`. */
export const CLAVE_MASCOTA_POS = "mascotaPos";
/** Día en que la escondió arrastrándola fuera. Vuelve al día siguiente. */
export const CLAVE_MASCOTA_OCULTA = "mascotaOculta";
/** Tema elegido: 'claro' | 'oscuro' | 'sistema'. Por defecto sigue al sistema. */
export const CLAVE_TEMA = "tema";
/** Token de acceso personal de GitHub, solo para revisar actualizaciones
 *  (el repo es privado — ver src/lib/version.ts). También vive solo en el
 *  dispositivo. */
export const CLAVE_GH_TOKEN = "githubToken";

/**
 * Comprobado contra la API: `gemini-2.5-flash` devuelve 404 con esta key, así
 * que no sirve de predeterminado. Los nombres cambian cada pocos meses; por eso
 * el modelo se edita desde Ajustes sin tocar el código.
 */
export const MODELO_POR_DEFECTO = "gemini-3.5-flash";

export async function leerAjuste(clave: string): Promise<string | undefined> {
  return (await db.ajustes.get(clave))?.valor;
}

export async function guardarAjuste(clave: string, valor: string): Promise<void> {
  const limpio = valor.trim();
  if (limpio) await db.ajustes.put({ clave, valor: limpio });
  else await db.ajustes.delete(clave);
}

export interface ConfigIA {
  apiKey?: string;
  modelo: string;
}

export async function configuracionIA(): Promise<ConfigIA> {
  const [apiKey, modelo] = await Promise.all([
    leerAjuste(CLAVE_API),
    leerAjuste(CLAVE_MODELO),
  ]);
  return { apiKey, modelo: modelo || MODELO_POR_DEFECTO };
}

export async function hayKey(): Promise<boolean> {
  return !!(await leerAjuste(CLAVE_API));
}
