import { db } from "./db";
import { aISO, desdeISO, indiceSemana, sumarDias, type DiaISO } from "../lib/fecha";
import { calcularRacha, type EstadoRacha } from "../lib/racha";
import { diasConRegistro, primerDiaConDatos } from "./agregados";
import { hoyISO } from "../lib/fecha";

export type PiezaKey =
  | "lentes"
  | "pesa"
  | "bandera"
  | "audifonos"
  | "camara"
  | "maletin"
  | "lapiz";

export interface Pieza {
  k: PiezaKey;
  nombre: string;
  area: string;
  regla: string;
  color: string;
  /** Cuánto lleva y cuánto hace falta esta semana. */
  hecho: number;
  falta: number;
}

/**
 * Cómo se sabe qué actividad es «lectura» o «ejercicio»: por el **ícono** que
 * el usuario eligió al crearla. No hay categorías en el modelo y no vale la
 * pena inventarlas — el ícono ya es la categoría, y se elige una sola vez.
 */
const ICONO_DE_AREA = { lectura: "book", ejercicio: "dumbbell", ingles: "lang" } as const;

const CATALOGO: Omit<Pieza, "hecho">[] = [
  { k: "lentes", nombre: "Lentes", area: "Lectura", regla: "Leer 4 de 7 días", color: "var(--pino)", falta: 4 },
  { k: "pesa", nombre: "Pesa", area: "Ejercicio", regla: "3 sesiones en la semana", color: "var(--pend)", falta: 3 },
  { k: "bandera", nombre: "Banderín", area: "Inglés", regla: "5 días distintos", color: "var(--video)", falta: 5 },
  { k: "audifonos", nombre: "Audífonos", area: "Música", regla: "4 ideas grabadas", color: "var(--musica)", falta: 4 },
  { k: "camara", nombre: "Cámara", area: "Video", regla: "Ideas en 4 días distintos", color: "var(--video)", falta: 4 },
  { k: "maletin", nombre: "Maletín", area: "Negocio", regla: "Una idea marcada hecha", color: "var(--negocio)", falta: 1 },
  { k: "lapiz", nombre: "Lápiz", area: "Diario", regla: "6 noches de diario", color: "var(--diario)", falta: 6 },
];

export function semanaDe(dia: DiaISO = hoyISO()): { desde: DiaISO; hasta: DiaISO } {
  const d = desdeISO(dia);
  const lunes = sumarDias(d, -indiceSemana(d));
  return { desde: aISO(lunes), hasta: aISO(sumarDias(lunes, 6)) };
}

/**
 * Lo que lleva puesto esta semana. Se recalcula siempre desde los datos, así
 * que el lunes se cae solo lo que dejó de hacerse: la mascota muestra el
 * presente, no su mejor mes (CLAUDE.md §6).
 */
export async function piezasDeLaSemana(dia: DiaISO = hoyISO()): Promise<Pieza[]> {
  const { desde, hasta } = semanaDe(dia);

  const sesiones = await db.sesiones.where("dia").between(desde, hasta, true, true).toArray();
  const actividades = await db.actividades.toArray();
  const iconoDe = new Map(actividades.map((a) => [a.id!, a.icono]));

  const porIcono = (icono: string) => sesiones.filter((s) => iconoDe.get(s.actividadId) === icono);
  const diasDistintos = (lista: { dia: DiaISO }[]) => new Set(lista.map((s) => s.dia)).size;

  const capturas = (await db.capturas.where("fecha").between(desde, hasta, true, true).toArray())
    .filter((c) => c.estado !== "eliminada");
  const deTipo = (t: string) => capturas.filter((c) => c.tipo === t);

  const conteo: Record<PiezaKey, number> = {
    lentes: diasDistintos(porIcono(ICONO_DE_AREA.lectura)),
    pesa: porIcono(ICONO_DE_AREA.ejercicio).length,
    bandera: diasDistintos(porIcono(ICONO_DE_AREA.ingles)),
    audifonos: deTipo("musica").length,
    camara: new Set(deTipo("video").map((c) => c.fecha)).size,
    maletin: deTipo("negocio").filter((c) => c.estado === "hecha").length,
    lapiz: new Set(deTipo("diario").map((c) => c.fecha)).size,
  };

  return CATALOGO.map((p) => ({ ...p, hecho: conteo[p.k] }));
}

export const estaPuesta = (p: Pieza) => p.hecho >= p.falta;

export async function estadoDeLaRacha(hoy: DiaISO = hoyISO()): Promise<EstadoRacha> {
  const desde = await primerDiaConDatos();
  if (!desde) {
    return {
      dias: 0,
      nudos: 0,
      ultimoDiaConRegistro: null,
      diaLibreUsado: null,
      hoyRegistrado: false,
    };
  }
  return calcularRacha(await diasConRegistro(desde, hoy), desde, hoy);
}
