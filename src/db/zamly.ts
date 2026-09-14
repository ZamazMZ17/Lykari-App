import { db, type ZamlyEvento, type ZamlyRacha } from "./db";
import { esNativo } from "../lib/plataforma";
import { Control } from "../control/plugin";

/**
 * Sección privada, detrás de contraseña. A diferencia de la racha principal
 * (nunca vuelve a cero — CLAUDE.md §6), acá el mecanismo es el opuesto y es
 * el punto: una recaída sí reinicia la racha actual. El mejor récord queda
 * aparte y no se borra nunca.
 */

const CLAVE_HASH = "zamlyPasswordHash";
const CLAVE_METODO = "zamlyMetodo";
const RACHA_ID = 1;

export type MetodoAcceso = "patron" | "clave";

export async function metodoAcceso(): Promise<MetodoAcceso> {
  const guardado = await db.ajustes.get(CLAVE_METODO);
  return guardado?.valor === "patron" ? "patron" : "clave";
}

async function hashear(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function tieneContrasena(): Promise<boolean> {
  return !!(await db.ajustes.get(CLAVE_HASH));
}

export async function establecerContrasena(nueva: string, metodo: MetodoAcceso = "clave"): Promise<void> {
  const hash = await hashear(nueva);
  await db.ajustes.put({ clave: CLAVE_HASH, valor: hash });
  await db.ajustes.put({ clave: CLAVE_METODO, valor: metodo });
  await sincronizarHashNativo(hash);
}

/**
 * La pantalla de bloqueo nativa compara contra este mismo hash para poder
 * verificar el patrón girado con la app cerrada. Se copia al motor cada vez que
 * se crea el acceso y al entrar a la sección. Nunca sale del dispositivo.
 */
export async function sincronizarHashNativo(hash?: string): Promise<void> {
  if (!esNativo) return;
  const valor = hash ?? (await db.ajustes.get(CLAVE_HASH))?.valor;
  if (!valor) return;
  try {
    await Control.guardarHashContrasena({ hash: valor, metodo: await metodoAcceso() });
  } catch {
    // APK viejo sin el plugin: se ignora.
  }
}

export async function verificarContrasena(intento: string): Promise<boolean> {
  const guardado = await db.ajustes.get(CLAVE_HASH);
  if (!guardado) return false;
  return (await hashear(intento)) === guardado.valor;
}

export async function obtenerRacha(): Promise<ZamlyRacha> {
  const existente = await db.zamlyRacha.get(RACHA_ID);
  if (existente) return existente;
  const nueva: ZamlyRacha = { id: RACHA_ID, inicio: Date.now(), ultimaRecaida: null, mejorRachaMs: 0 };
  await db.zamlyRacha.put(nueva);
  return nueva;
}

/** Tiempo transcurrido desde el inicio de la racha actual (último reinicio, o el arranque). */
export function msDeRachaActual(racha: ZamlyRacha, ahora = Date.now()): number {
  return Math.max(0, ahora - (racha.ultimaRecaida ?? racha.inicio));
}

export async function registrarRecaida(nota?: string): Promise<void> {
  const racha = await obtenerRacha();
  const actual = msDeRachaActual(racha);
  const ahora = Date.now();
  await db.zamlyEventos.add({ fecha: ahora, nota: nota?.trim() || undefined });
  await db.zamlyRacha.put({
    ...racha,
    ultimaRecaida: ahora,
    mejorRachaMs: Math.max(racha.mejorRachaMs, actual),
  });
}

export async function eventosRecientes(limite = 20): Promise<ZamlyEvento[]> {
  return db.zamlyEventos.orderBy("fecha").reverse().limit(limite).toArray();
}
