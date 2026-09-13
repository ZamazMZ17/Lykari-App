import { db } from "../db/db";
import type { DiaSemana, HorarioModo } from "./tipos";

/**
 * Arma los horarios del modo "En clase" a partir de los cursos activos del
 * horario de la app. Cada bloque de curso (día + hora inicio/fin) se convierte
 * en un `HorarioModo`.
 *
 * Ojo con la convención de días: `BloqueCurso.dia` usa lunes=0…domingo=6,
 * mientras que `HorarioModo.dias` usa domingo=0…sábado=6 (como `Date.getDay`).
 * La conversión es `(dia + 1) % 7`.
 *
 * Bloques con el mismo inicio y fin se juntan en un solo horario con varios días
 * (ej. lunes y miércoles 8:00–10:00 → un horario con dias [1,3]).
 */
export async function horariosDeClase(): Promise<HorarioModo[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const cursos = await db.cursos.toArray();
  const porFranja = new Map<string, Set<DiaSemana>>();

  for (const curso of cursos) {
    if (!curso.activo) continue;
    // Solo cursos cuyo ciclo cubre hoy, si traen rango.
    if (curso.desde && curso.hasta && (hoy < curso.desde || hoy > curso.hasta)) continue;
    for (const b of curso.bloques ?? []) {
      if (!b.horaInicio || !b.horaFin) continue;
      const diaSemana = ((b.dia + 1) % 7) as DiaSemana;
      const clave = `${b.horaInicio}-${b.horaFin}`;
      const set = porFranja.get(clave) ?? new Set<DiaSemana>();
      set.add(diaSemana);
      porFranja.set(clave, set);
    }
  }

  return [...porFranja.entries()]
    .map(([franja, dias]) => {
      const [desde, hasta] = franja.split("-");
      return { desde, hasta, dias: [...dias].sort((a, b) => a - b) } as HorarioModo;
    })
    .sort((a, b) => a.desde.localeCompare(b.desde));
}
