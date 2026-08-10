import type { Sesion } from "../db/db";

export const MINUTO = 60_000;
export const HORA = 60 * MINUTO;

/** Enfoque: se cierra sola a las 3 h de tiempo registrado. */
export const LIMITE_ENFOQUE = 3 * HORA;
/** Recreativa: nunca se cierra sola, solo avisa a las 2 h y sigue contando. */
export const AVISO_RECREATIVA = 2 * HORA;

/**
 * Tiempo realmente registrado de una sesión: reloj de pared menos las pausas.
 * Se calcula siempre desde las marcas guardadas, nunca desde un contador en
 * memoria — así el cronómetro sobrevive a cerrar la app o recargar.
 */
export function msRegistrados(s: Sesion, ahora = Date.now()): number {
  const fin = s.fin ?? ahora;
  let total = fin - s.inicio;
  for (const p of s.pausas) {
    const hasta = Math.min(p.hasta ?? fin, fin);
    total -= Math.max(0, hasta - p.desde);
  }
  return Math.max(0, total);
}

export function estaPausada(s: Sesion): boolean {
  return s.pausas.some((p) => p.hasta === null);
}

/**
 * Instante de reloj en que la sesión alcanzó (o alcanzará) `objetivoMs` de
 * tiempo registrado. Devuelve null si está pausada y aún no llegó: mientras
 * siga en pausa, ese punto no se alcanza nunca.
 */
export function instanteAlAcumular(
  s: Sesion,
  objetivoMs: number,
): number | null {
  let restante = objetivoMs;
  let cursor = s.inicio;
  const pausas = [...s.pausas].sort((a, b) => a.desde - b.desde);
  for (const p of pausas) {
    const activo = p.desde - cursor;
    if (activo >= restante) return cursor + restante;
    restante -= activo;
    if (p.hasta === null) return null;
    cursor = p.hasta;
  }
  return cursor + restante;
}

/** hh:mm:ss para el cronómetro grande y la barra de sesión activa. */
export function cronometro(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const enMinutos = (ms: number) => Math.floor(ms / MINUTO);

/** «1 h 25» / «42 min» — para textos, no para el cronómetro. */
export function duracionLarga(ms: number): string {
  const min = enMinutos(ms);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`;
}
