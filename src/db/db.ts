import Dexie, { type Table } from "dexie";
import type { DiaISO } from "../lib/fecha";

export type Alcance = "hoy" | "semana" | "mes";
export type TipoActividad = "enfoque" | "recreativa";

/**
 * Nota de implementación: IndexedDB no admite booleanos como clave, así que
 * los campos que se indexan (`activa`, `abierta`) se guardan como 0 | 1.
 * El resto del modelo es el acordado en CLAUDE.md §7.
 */
export type Bandera = 0 | 1;

export interface Actividad {
  id?: number;
  nombre: string;
  icono: string;
  alcance: Alcance;
  desde: DiaISO;
  hasta: DiaISO;
  /** 0 = sin tiempo de referencia. Es solo una marca visual. */
  referenciaMin: number;
  tipo: TipoActividad;
  activa: Bandera;
  creada: number;
}

export interface Pausa {
  desde: number;
  hasta: number | null;
}

export interface Sesion {
  id?: number;
  actividadId: number;
  /** Día al que pertenece la sesión = día en que empezó. */
  dia: DiaISO;
  inicio: number;
  fin: number | null;
  /** Espejo indexable de `fin === null`. */
  abierta: Bandera;
  pausas: Pausa[];
  /** Fase 2. */
  audioBlob?: Blob;
  transcripcion?: string;
  cerradaAuto: boolean;
  audioPendiente: boolean;
}

export type TipoCaptura = "musica" | "video" | "negocio" | "diario" | "pendiente";

/**
 * `nueva`    — el audio está guardado pero todavía no pasó por la IA.
 * `procesada`— ya tiene título y descripción.
 * `hecha`    — el usuario la marcó como hecha (no aplica al diario).
 * `eliminada`— fuera de la lista; el audio se borra, la fila queda.
 *
 * El audio se guarda antes de llamar a nada. Si la IA falla o no hay key, lo
 * grabado no se pierde: queda como `nueva` y se puede reintentar.
 */
export type EstadoCaptura = "nueva" | "procesada" | "hecha" | "eliminada";

export interface Captura {
  id?: number;
  tipo: TipoCaptura;
  fecha: DiaISO;
  creada: number;
  audioBlob?: Blob;
  duracionMs?: number;
  transcripcion?: string;
  titulo?: string;
  descripcion?: string;
  /** Solo música: la letra ordenada y qué tipo de canción podría ser. */
  estructura?: string;
  tipoCancion?: string;
  estado: EstadoCaptura;
  /** Último error de procesamiento, para poder mostrarlo y reintentar. */
  error?: string;
  procesadaEn?: number;
}

export interface Tarea {
  id?: number;
  texto: string;
  descripcion?: string;
  origenCapturaId?: number;
  /** Día del cierre que la propuso, si vino del análisis de la noche. */
  origenCierre?: DiaISO;
  /**
   * Solo las del cierre caducan. Una lista infinita de tareas reproduce
   * exactamente la trampa del horario de 30 días (CLAUDE.md §8).
   */
  caduca?: DiaISO;
  vence?: DiaISO;
  recordatorio?: number;
  hecha: Bandera;
  creada: number;
}

/** Clave-valor para lo que configura el usuario (la key de la IA, el modelo). */
export interface Ajuste {
  clave: string;
  valor: string;
}

/** Las cuatro miradas del análisis de la noche (CLAUDE.md §8). */
export interface Analisis {
  sostuvo: string;
  cayo: string;
  costo: string;
  seRepite: string;
}

export interface EstadisticasDia {
  msTotal: number;
  sesiones: number;
  capturas: number;
  porActividad: { nombre: string; ms: number }[];
}

export interface Cierre {
  fecha: DiaISO;
  resumen: string;
  estadisticas: EstadisticasDia;
  analisis: Analisis;
  creado: number;
  /** Si la IA falló, queda escrito y el día se puede reintentar. */
  error?: string;
}

export interface Racha {
  id: number;
  dias: number;
  nudos: number;
  ultimoDiaConRegistro: DiaISO | null;
  diaLibreUsadoEnSemana: DiaISO | null;
}

/**
 * Un bloque de horario dentro de la semana de un curso. `dia` usa la misma
 * convención que `indiceSemana` (lunes = 0 … domingo = 6). Un curso puede
 * tener varios bloques (ej. lunes y miércoles a horas distintas).
 */
export interface BloqueCurso {
  dia: number;
  horaInicio: string; // 'HH:MM'
  horaFin: string; // 'HH:MM'
  salon?: string;
}

export type Modalidad = "presencial" | "semipresencial" | "distancia";

export interface Curso {
  id?: number;
  nombre: string;
  codigo?: string;
  /** Rango del ciclo/periodo, ej. del 24-08 al 06-12. */
  desde: DiaISO;
  hasta: DiaISO;
  bloques: BloqueCurso[];
  /** Lo que trae el sílabo. Todo opcional: el curso sirve igual sin nada de esto. */
  nrc?: string;
  profesor?: string;
  aad?: string;
  modalidad?: Modalidad;
  creditos?: number;
  /** Texto libre tal como aparece en el sílabo, ej. "NF = 0.10·PC1 + …". Solo
   *  referencia: la app no evalúa la fórmula, calcula sobre `Evaluacion.peso`. */
  formulaNota?: string;
  activo: Bandera;
  creada: number;
}

/**
 * Un componente de la nota final (ej. "Práctica Calificada 1", 10%). `peso`
 * es el porcentaje que ese componente vale sobre el 100% del curso. `nota`
 * es sobre 20 (escala vigesimal), y solo existe una vez rendida.
 */
export interface Evaluacion {
  id?: number;
  cursoId: number;
  nombre: string;
  peso: number;
  /** Semana estimada del sílabo, si no hay fecha concreta todavía. */
  semana?: number;
  /** Fecha real, cuando ya se sabe. Con ella aparece en Horario. */
  fecha?: DiaISO;
  recuperable: boolean;
  nota?: number;
  hecha: Bandera;
  creada: number;
}

class BaseLykari extends Dexie {
  actividades!: Table<Actividad, number>;
  sesiones!: Table<Sesion, number>;
  capturas!: Table<Captura, number>;
  tareas!: Table<Tarea, number>;
  cierres!: Table<Cierre, string>;
  racha!: Table<Racha, number>;
  ajustes!: Table<Ajuste, string>;
  cursos!: Table<Curso, number>;
  evaluaciones!: Table<Evaluacion, number>;

  constructor() {
    super("lykari");
    this.version(1).stores({
      actividades: "++id, activa, desde, hasta, creada",
      sesiones: "++id, actividadId, dia, abierta, inicio",
      capturas: "++id, tipo, fecha, estado",
      tareas: "++id, vence, hecha, origenCapturaId",
      cierres: "fecha",
      racha: "id",
    });
    // Los campos nuevos de `capturas` y `tareas` no se indexan, así que no
    // hacen falta migraciones: solo cambia lo que sí es índice.
    this.version(2).stores({
      capturas: "++id, tipo, fecha, estado, creada",
      ajustes: "clave",
    });
    this.version(3).stores({
      tareas: "++id, vence, hecha, origenCapturaId, origenCierre, caduca",
    });
    this.version(4).stores({
      cursos: "++id, activo, desde, hasta, creada",
    });
    // Los campos nuevos de `Curso` (nrc, profesor, modalidad…) no se indexan.
    this.version(5).stores({
      evaluaciones: "++id, cursoId, fecha, hecha",
    });
  }
}

export const db = new BaseLykari();
