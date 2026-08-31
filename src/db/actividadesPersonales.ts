import { db } from "./db";
import { crearActividad, type NuevaActividad } from "./acciones";

/**
 * Actividades que el dueño pidió agregar directamente (no las crea desde el
 * formulario). Idempotente y respeta lo que el usuario ya haya retirado del
 * tablón: solo se crean la primera vez, nunca se reviven solas.
 */
const ACTIVIDADES: NuevaActividad[] = [
  { nombre: "Inglés", icono: "lang", alcance: "siempre", referenciaMin: 30, tipo: "enfoque" },
  { nombre: "Mecanografía", icono: "key", alcance: "siempre", referenciaMin: 30, tipo: "enfoque" },
  { nombre: "Película", icono: "tv", alcance: "siempre", referenciaMin: 0, tipo: "recreativa" },
  { nombre: "Descanso", icono: "moon", alcance: "siempre", referenciaMin: 0, tipo: "recreativa" },
  { nombre: "Leer", icono: "book", alcance: "siempre", referenciaMin: 30, tipo: "enfoque" },
  {
    nombre: "Mano izquierda",
    icono: "pencil",
    alcance: "semana",
    referenciaMin: 10,
    tipo: "enfoque",
  },
];

/** Nombre viejo → nombre actual, solo para renombrar lo que ya se haya creado. */
const RENOMBRES: Record<string, string> = {
  "Escribir con la mano izquierda": "Mano izquierda",
};

export async function sembrarActividadesPersonales(): Promise<void> {
  const porNombre = new Map((await db.actividades.toArray()).map((a) => [a.nombre, a]));

  for (const [viejo, nuevo] of Object.entries(RENOMBRES)) {
    const act = porNombre.get(viejo);
    if (act && !porNombre.has(nuevo)) {
      await db.actividades.update(act.id!, { nombre: nuevo });
      porNombre.delete(viejo);
      porNombre.set(nuevo, act);
    }
  }

  for (const datos of ACTIVIDADES) {
    if (porNombre.has(datos.nombre)) continue;
    await crearActividad(datos);
  }

  // Corrige duplicados que pudo dejar una corrida anterior de este mismo
  // sembrado (ej. un renombre sin refrescar el mapa antes de crear).
  const nombresManejados = new Set([...ACTIVIDADES.map((a) => a.nombre), ...Object.values(RENOMBRES)]);
  const frescas = await db.actividades.where("activa").equals(1).toArray();
  for (const nombre of nombresManejados) {
    const repetidas = frescas.filter((a) => a.nombre === nombre).sort((a, b) => a.creada - b.creada);
    for (const extra of repetidas.slice(1)) {
      await db.actividades.update(extra.id!, { activa: 0 });
    }
  }
}
