import Dexie, { type Table } from "dexie";
import type { DiaISO } from "../lib/fecha";
import type { MotivoBloqueo, ReglasControl } from "../control/tipos";
import type { PreguntaCurso, SesionEstudio, TarjetaEstudio } from "../estudio/tipos";

/**
 * `siempre` — indefinida, sin fecha de fin (Ejercicio, GymFace: CLAUDE.md
 * fase actual las trata como permanentes). `personalizado` — rango explícito
 * fijado por código, no por el usuario en el formulario (ej. una actividad
 * de estudio ligada a la duración de un curso).
 */
export type Alcance = "hoy" | "semana" | "mes" | "siempre" | "personalizado";
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
  /** Curso al que aporta esta actividad, cuando es estudio propio. */
  cursoId?: number;
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
  /** Último error de transcripción, para poder mostrarlo y reintentar. */
  error?: string;
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
  /** Referencia personal para el cálculo de nota, no una promesa de resultado. */
  notaObjetivo?: number;
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

export type TipoAulaUPC = "entrega" | "examen" | "control" | "anuncio" | "evaluacion";

/** Hecho publicado por UPC. La fuente manda; las decisiones personales siguen locales. */
export interface ItemAulaUPC {
  id: string;
  cursoClave?: string;
  cursoId?: number;
  tipo: TipoAulaUPC;
  titulo: string;
  descripcion?: string;
  publicado?: string;
  vence?: DiaISO;
  actualizado: string;
  estado: "activo" | "retirado";
  novedad: Bandera;
  leido: Bandera;
  /** Decisión local: UPC conserva el hecho, pero no vuelve a mostrarse aquí. */
  oculto?: Bandera;
  convertidoTareaId?: number;
}

/** Componente oficial recibido desde el aula. No modifica evaluaciones manuales. */
export interface ComponenteNotaUPC {
  id: string;
  cursoClave: string;
  cursoId?: number;
  nombre: string;
  peso?: number;
  nota?: number;
  actualizado: string;
}

/* ── planes de Ejercicio y GymFace ──────────────────────────────────
 * Única parte de la app con seguimiento de cumplimiento real (excepción
 * explícita y acotada a estas dos secciones — CLAUDE.md §2 sigue rigiendo
 * para el resto: nunca hay estado "fallaste" fuera de acá). El nivel sube
 * solo con la práctica real acumulada; nunca baja solo, nunca bloquea. */
export type CategoriaPlan = "ejercicio" | "gymface";

export interface EjercicioDeRutina {
  nombre: string;
  detalle: string;
  /** Descanso sugerido entre series, en segundos. Sin marca si no aplica (ej. un hold único). */
  descansoSeg?: number;
}

export interface DiaDeRutina {
  titulo: string;
  ejercicios: EjercicioDeRutina[];
}

export interface NivelDePlan {
  numero: number;
  nombre: string;
  /** Cuántos días completos de este nivel hacen falta para subir al siguiente. */
  sesionesParaSubir: number;
  /** Rotación de días de rutina dentro del nivel (ej. Empuje / Tirón). */
  dias: DiaDeRutina[];
}

export interface Plan {
  id?: number;
  categoria: CategoriaPlan;
  actividadId: number;
  nivelActual: number;
  creada: number;
}

export interface RegistroPlan {
  id?: number;
  planId: number;
  /** Un registro por día: la segunda vez que se guarda el mismo día, se actualiza. */
  dia: DiaISO;
  nivelNumero: number;
  diaRutinaIndice: number;
  ejerciciosHechos: string[];
  completo: Bandera;
  creada: number;
  /** Sesión cronometrada durante la que se marcó la rutina, si la hubo. */
  sesionId?: number;
}

/* ── Zamly: racha privada, detrás de contraseña ───────────────────────
 * A diferencia de la racha principal (nunca vuelve a cero, CLAUDE.md §6),
 * acá el mecanismo es justo el opuesto y es el punto de la sección: una
 * recaída sí reinicia la racha actual. El mejor récord queda aparte y no se
 * borra nunca. */
export interface ZamlyRacha {
  id: number;
  inicio: number;
  ultimaRecaida: number | null;
  mejorRachaMs: number;
}

export interface ZamlyEvento {
  id?: number;
  fecha: number;
  nota?: string;
}

/* ── Control: tiempo en pantalla ──────────────────────────────────────
 * Las reglas viven como un único documento (id 1) para empujarlas enteras al
 * motor nativo. El uso diario se fotografía al abrir la app, porque Android
 * solo guarda detalle de pocos días. Tipos en `src/control/tipos.ts`. */
export interface ControlReglasFila {
  id: number;
  reglas: ReglasControl;
}

export interface ControlUsoDiario {
  id?: number;
  dia: DiaISO;
  paquete: string;
  ms: number;
  aperturas: number;
}

export interface ControlIntento {
  id?: number;
  fecha: number;
  motivo: MotivoBloqueo;
  origen: string;
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
  planes!: Table<Plan, number>;
  registrosPlan!: Table<RegistroPlan, number>;
  zamlyRacha!: Table<ZamlyRacha, number>;
  zamlyEventos!: Table<ZamlyEvento, number>;
  aulaItems!: Table<ItemAulaUPC, string>;
  componentesNotaUPC!: Table<ComponenteNotaUPC, string>;
  controlReglas!: Table<ControlReglasFila, number>;
  controlUsoDiario!: Table<ControlUsoDiario, number>;
  controlIntentos!: Table<ControlIntento, number>;
  preguntasCurso!: Table<PreguntaCurso, number>;
  sesionesEstudio!: Table<SesionEstudio, number>;
  tarjetasEstudio!: Table<TarjetaEstudio, number>;

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
    this.version(6).stores({
      planes: "++id, categoria, actividadId",
      registrosPlan: "++id, planId, dia",
      zamlyRacha: "id",
      zamlyEventos: "++id, fecha",
    });
    this.version(7).stores({
      aulaItems: "id, cursoId, vence, estado, novedad, leido, actualizado",
      componentesNotaUPC: "id, cursoId, cursoClave, actualizado",
    });
    // `RegistroPlan.sesionId` no se indexa.
    this.version(8).stores({
      controlReglas: "id",
      controlUsoDiario: "++id, dia, paquete, [dia+paquete]",
      controlIntentos: "++id, fecha, motivo",
    });
    this.version(9).stores({
      preguntasCurso: "++id, cursoId, tema",
      sesionesEstudio: "++id, fecha, cursoId",
    });
    this.version(10).stores({
      tarjetasEstudio: "++id, cursoId, tema",
    });
    this.version(11).stores({
      sesionesEstudio: "++id, fecha, cursoId, tipoActividad, [fecha+cursoId]",
    });
  }
}

export const db = new BaseLykari();
