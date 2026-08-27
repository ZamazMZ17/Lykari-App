import { db, type BloqueCurso, type Curso, type Modalidad } from "./db";
import { desdeISO, indiceSemana, type DiaISO } from "../lib/fecha";

export interface NuevoCurso {
  nombre: string;
  codigo?: string;
  desde: DiaISO;
  hasta: DiaISO;
  bloques: BloqueCurso[];
  nrc?: string;
  profesor?: string;
  aad?: string;
  modalidad?: Modalidad;
  creditos?: number;
  formulaNota?: string;
}

const limpiar = (s?: string) => s?.trim() || undefined;

export async function crearCurso(datos: NuevoCurso): Promise<number> {
  return db.cursos.add({
    ...datos,
    nombre: datos.nombre.trim(),
    codigo: limpiar(datos.codigo),
    nrc: limpiar(datos.nrc),
    profesor: limpiar(datos.profesor),
    aad: limpiar(datos.aad),
    formulaNota: limpiar(datos.formulaNota),
    activo: 1,
    creada: Date.now(),
  });
}

export async function actualizarCurso(id: number, datos: NuevoCurso): Promise<void> {
  await db.cursos.update(id, {
    ...datos,
    nombre: datos.nombre.trim(),
    codigo: limpiar(datos.codigo),
    nrc: limpiar(datos.nrc),
    profesor: limpiar(datos.profesor),
    aad: limpiar(datos.aad),
    formulaNota: limpiar(datos.formulaNota),
  });
}

/** Quitarlo no borra nada más: no hay sesiones ni historial ligado a un curso. */
export async function eliminarCurso(id: number): Promise<void> {
  await db.cursos.update(id, { activo: 0 });
}

export async function cursosActivos(): Promise<Curso[]> {
  const vivos = await db.cursos.where("activo").equals(1).toArray();
  return vivos.sort((a, b) => a.creada - b.creada);
}

export interface BloqueDelDia {
  curso: Curso;
  bloque: BloqueCurso;
}

/** Los bloques que caen en un día concreto, dentro del rango de fechas del curso. */
export function bloquesDelDia(cursos: Curso[], dia: DiaISO): BloqueDelDia[] {
  const idx = indiceSemana(desdeISO(dia));
  const salida: BloqueDelDia[] = [];
  for (const curso of cursos) {
    if (dia < curso.desde || dia > curso.hasta) continue;
    for (const bloque of curso.bloques) {
      if (bloque.dia === idx) salida.push({ curso, bloque });
    }
  }
  return salida.sort((a, b) => a.bloque.horaInicio.localeCompare(b.bloque.horaInicio));
}
