import { db } from "./db";
import { crearActividad } from "./acciones";
import { cursosActivos } from "./cursos";

const PREFIJO = "Estudiar ";
/** Prefijo viejo (con dos puntos), solo para migrar nombres ya creados. */
const PREFIJO_VIEJO = "Estudiar: ";

/** Nombre corto para el tablón — el nombre completo del curso vive en Horario. */
const NOMBRES_CORTOS: Record<string, string> = {
  "Arquitectura de Negocio": "Arq. Negocio",
  "Cálculo II": "Cálculo II",
  "Diseño de Experimentos en SI": "Diseño Exp.",
  "Fundamentos de Sistemas de Información": "Fundamentos SI",
  "Redes y Comunicaciones de Datos": "Redes y Datos",
};

/**
 * Por cada curso activo, asegura que exista una Actividad de estudio propio
 * ligada a la duración del ciclo (no solo asistir a clase: esto sirve para
 * registrar cuando el usuario estudia por su cuenta). Idempotente: si ya
 * existe (activa o retirada por el usuario) no la vuelve a crear. Si sigue
 * activa y el ciclo del curso cambió de fecha, sincroniza el `hasta`.
 */
export async function sembrarEstudioDeCursos(): Promise<void> {
  const cursos = await cursosActivos();
  const todasLasActividades = await db.actividades.toArray();
  const porNombre = new Map(todasLasActividades.map((a) => [a.nombre, a]));

  for (const curso of cursos) {
    const corto = NOMBRES_CORTOS[curso.nombre] ?? curso.nombre;
    const nombre = `${PREFIJO}${corto}`;
    const existente = porNombre.get(nombre) ?? porNombre.get(`${PREFIJO_VIEJO}${curso.nombre}`);

    if (!existente) {
      await crearActividad({
        nombre,
        icono: "book",
        alcance: "personalizado",
        hastaPersonalizado: curso.hasta,
        referenciaMin: 0,
        tipo: "enfoque",
      });
      continue;
    }

    // Retirada a propósito por el usuario: se respeta, no se revive sola.
    if (!existente.activa) continue;

    if (existente.hasta !== curso.hasta || existente.nombre !== nombre) {
      await db.actividades.update(existente.id!, { hasta: curso.hasta, nombre });
    }
  }
}
