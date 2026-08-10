/**
 * Día lógico = día natural local. El cierre del día ocurre a medianoche
 * (no hay cron: se reconcilia al abrir la app). Una sesión pertenece al día
 * en que empezó, aunque cruce la medianoche.
 */

export type DiaISO = string; // 'YYYY-MM-DD'

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export function aISO(d: Date): DiaISO {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

export function desdeISO(iso: DiaISO): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function hoyISO(ahora = new Date()): DiaISO {
  return aISO(ahora);
}

export function diaDe(ms: number): DiaISO {
  return aISO(new Date(ms));
}

/** Lunes = 0 … domingo = 6 (así se lee la semana en español). */
export function indiceSemana(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Último día en que una actividad sigue apareciendo en el tablón,
 * según el alcance elegido al crearla. El alcance nunca es retroactivo:
 * empieza el día en que se creó.
 */
export function finDeAlcance(
  alcance: "hoy" | "semana" | "mes",
  base = new Date(),
): DiaISO {
  if (alcance === "hoy") return aISO(base);
  if (alcance === "semana") return aISO(sumarDias(base, 6 - indiceSemana(base)));
  return aISO(new Date(base.getFullYear(), base.getMonth() + 1, 0));
}

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «Domingo 26 de julio» — el eyebrow de la pantalla Hoy. */
export function fechaLarga(d = new Date()): string {
  const nombre = DIAS[d.getDay()];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * Días naturales de `desde` a `hasta`. Compara días, no instantes, así que el
 * horario de verano no puede convertir «mañana» en «hoy».
 */
export function diasEntre(desde: DiaISO, hasta: DiaISO): number {
  const a = desdeISO(desde);
  const b = desdeISO(hasta);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** «sáb 25 jul» — para listas donde la fecha es un dato más. */
export function fechaCorta(iso: DiaISO): string {
  const d = desdeISO(iso);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

/** Semana ISO: la que contiene el jueves manda. */
export function numeroSemana(iso: DiaISO): number {
  const d = desdeISO(iso);
  const jueves = sumarDias(d, 3 - indiceSemana(d));
  const primero = new Date(jueves.getFullYear(), 0, 1);
  return 1 + Math.round((jueves.getTime() - primero.getTime()) / 86_400_000 / 7);
}

/** «julio 2026» — el pie del riel del camino. */
export function mesYAno(iso: DiaISO): string {
  const d = desdeISO(iso);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function mesCorto(iso: DiaISO): string {
  return MESES_CORTOS[desdeISO(iso).getMonth()];
}

/** Milisegundos que faltan para la próxima medianoche. */
export function msHastaMedianoche(ahora = new Date()): number {
  const m = new Date(ahora);
  m.setHours(24, 0, 0, 0);
  return m.getTime() - ahora.getTime();
}
