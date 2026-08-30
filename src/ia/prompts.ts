import type { Esquema } from "./gemini";
import type { TipoCaptura } from "../db/db";
import { fechaLarga, hoyISO } from "../lib/fecha";

/**
 * Reglas de tono. Salen de CLAUDE.md §8 y de los ejemplos del prototipo:
 * concreto, sin adulación, y sobre todo sin inventar lo que no se dijo.
 */
const REGLAS = `
Escribe en español, tuteando a quien grabó el audio.
Reglas que no se rompen:
- Solo puedes usar lo que está en el audio. No inventes datos, nombres,
  fechas ni intenciones que no aparezcan.
- Si algo se entendió a medias, dilo. No lo rellenes.
- Nada de elogios ni de ánimo ("¡buena idea!", "vas por buen camino").
  No sirven y no se pidieron.
- No juzgues a la persona. Habla de la idea o del contenido.
- Si el audio está vacío o es inaudible, dilo en la descripción y deja el
  título en una frase que lo diga.
`.trim();

const TRANSCRIPCION =
  "transcripcion: lo que se dijo, literal y limpio de muletillas repetidas. " +
  "No lo resumas ni lo corrijas de estilo.";

const esquemaIdea = (conMusica: boolean): Esquema => ({
  type: "object",
  properties: {
    transcripcion: { type: "string" },
    titulo: { type: "string" },
    descripcion: { type: "string" },
    ...(conMusica
      ? {
          estructura: { type: "string" },
          tipoCancion: { type: "string" },
        }
      : {}),
  },
  required: conMusica
    ? ["transcripcion", "titulo", "descripcion", "estructura", "tipoCancion"]
    : ["transcripcion", "titulo", "descripcion"],
  propertyOrdering: conMusica
    ? ["transcripcion", "titulo", "descripcion", "estructura", "tipoCancion"]
    : ["transcripcion", "titulo", "descripcion"],
});

const ESQUEMA_DIARIO: Esquema = {
  type: "object",
  properties: {
    transcripcion: { type: "string" },
    texto: { type: "string" },
  },
  required: ["transcripcion", "texto"],
  propertyOrdering: ["transcripcion", "texto"],
};

const ESQUEMA_PENDIENTES: Esquema = {
  type: "object",
  properties: {
    transcripcion: { type: "string" },
    tareas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto: { type: "string" },
          descripcion: { type: "string" },
          vence: { type: "string", nullable: true },
          hora: { type: "string", nullable: true },
        },
        required: ["texto", "descripcion"],
        propertyOrdering: ["texto", "descripcion", "vence", "hora"],
      },
    },
  },
  required: ["transcripcion", "tareas"],
  propertyOrdering: ["transcripcion", "tareas"],
};

export interface RespuestaIdea {
  transcripcion: string;
  titulo: string;
  descripcion: string;
  estructura?: string;
  tipoCancion?: string;
}

export interface RespuestaDiario {
  transcripcion: string;
  texto: string;
}

export interface RespuestaPendientes {
  transcripcion: string;
  tareas: {
    texto: string;
    descripcion: string;
    vence?: string | null;
    hora?: string | null;
  }[];
}

const TITULO =
  "titulo: corto, como el nombre de un chat. Cinco o seis palabras como mucho. " +
  "Que se entienda de qué va sin abrirlo. Sin comillas y sin punto final.";

const DESCRIPCION =
  "descripcion: de dos a cuatro frases. Di lo concreto que hay en el audio y, " +
  "si falta algo para que la idea avance, dilo con esas palabras: qué dijiste " +
  "y qué no dijiste. Nada de relleno.";

const PROMPTS: Record<TipoCaptura, string> = {
  musica: `${REGLAS}

Este audio es una idea de canción: puede ser una letra, un tarareo o las dos cosas.

Devuelve:
- ${TRANSCRIPCION} Si hay tarareo sin palabras, descríbelo en una línea.
- ${TITULO}
- ${DESCRIPCION}
- estructura: la letra ordenada por partes (verso, pre-coro, coro, puente),
  usando solo lo que se cantó o dijo. Si no alcanza para una parte, escríbelo.
  Si no hay letra, deja claro que es solo melodía.
- tipoCancion: qué tipo de canción podría ser, en una línea: género, ritmo y
  tono aproximados. Es una sugerencia, no una sentencia.`,

  video: `${REGLAS}

Este audio es una idea para un video.

Devuelve:
- ${TRANSCRIPCION}
- ${TITULO}
- ${DESCRIPCION} Incluye, si se dijeron, el formato y la duración. Si la idea
  no se distingue de cualquier otro video sobre el tema, dilo.`,

  negocio: `${REGLAS}

Este audio es una idea de negocio.

Devuelve:
- ${TRANSCRIPCION}
- ${TITULO}
- ${DESCRIPCION} Nombra lo que falta para que deje de ser una idea suelta
  (capital, quién lo hace, a quién se le vende), pero solo si de verdad no
  está en el audio.`,

  diario: `${REGLAS}

Este audio es el diario de la noche.

Devuelve:
- ${TRANSCRIPCION}
- texto: lo mismo, pero escrito en primera persona, como si lo hubiera escrito
  él en su diario. Mantén su manera de hablar y el orden en que lo contó.
  En párrafos, sin viñetas ni títulos. No agregues reflexiones, conclusiones ni
  consejos que no estén en el audio: esto es su diario, no tu opinión.`,

  pendiente: `${REGLAS}

Este audio son cosas que tiene que hacer. Sácalas como tareas.

Devuelve:
- ${TRANSCRIPCION}
- tareas: una por cada cosa que hay que hacer. Si solo dijo una, devuelve una.
  Si no hay ninguna tarea clara, devuelve la lista vacía.
  - texto: la tarea en imperativo y corta ("Lavar la ropa").
  - descripcion: de dónde sale y lo que dijo alrededor. Una o dos frases.
  - vence: fecha en formato AAAA-MM-DD si la dijo o se deduce sin dudas de sus
    palabras ("el sábado", "mañana", "antes del lunes"). Si no dijo cuándo,
    déjalo en null. No inventes plazos.
  - hora: la hora del día en formato HH:MM de 24 horas, solo si la dijo
    ("a las 8 de la mañana" → "08:00", "a las 7 de la noche" → "19:00").
    Si no dijo ninguna hora, déjalo en null. No inventes horas.`,
};

/* ── cierre de una sesión ────────────────────────────────────────── */

/**
 * Solo transcripción, sin título ni descripción: esto no es una idea que
 * navegar después, es la nota que el cierre del día va a leer directo
 * (CLAUDE.md §8, `conto` en `ia/cierre.ts`).
 */
export const PROMPT_SESION = `${REGLAS}

Este audio es lo que alguien contó justo al terminar una sesión de una
actividad: qué hizo y cómo le fue.

Devuelve solo:
- transcripcion: lo que dijo, limpio de muletillas repetidas y pasado a
  primera persona si hace falta. No lo resumas ni le agregues nada.`;

export const ESQUEMA_SESION: Esquema = {
  type: "object",
  properties: { transcripcion: { type: "string" } },
  required: ["transcripcion"],
};

export interface RespuestaSesion {
  transcripcion: string;
}

/* ── cierre del día ──────────────────────────────────────────────── */

/**
 * Esto se discutió a fondo y hay que respetarlo (CLAUDE.md §8). El usuario no
 * quiere positivismo: quiere ver lo que lo está consumiendo sin darse cuenta.
 * Pero criticar a la persona en vez del patrón es inaccionable, y opinar sobre
 * un día sin datos es inventar.
 */
export const PROMPT_CIERRE = `
Eres el análisis de la noche de un registro personal. Escribe en español,
tuteando. Te paso lo que esta persona registró hoy: sesiones de actividad con
su duración real, y lo que grabó al cerrarlas.

El tono, que no se negocia:
- Crítico y neutro. Ni ánimo ni felicitaciones. Esta persona pidió
  explícitamente que le señales lo que la está consumiendo sin que lo note.
- Critica el patrón, nunca a la persona. «Once días sin ejercicio y sigue en el
  tablón» sirve. «Eres inconstante» es una etiqueta que no se puede accionar.
- Solo puedes hablar de lo que está registrado. Si no hay datos de algo, di
  «no hay registro». Nunca «fuiste flojo», nunca supongas qué hizo en las horas
  que no aparecen.
- No existe ningún plan ni horario. Nunca digas lo que «debería» haber hecho,
  ni compares contra una meta. El tiempo de referencia de una actividad es una
  marca visual, no un objetivo: pasarse de él es normal y no se comenta.
- Nada de rojo ni de lenguaje de fracaso. Un día sin registro es un día sin
  registro, no un día perdido.

Devuelve:
- resumen: una frase con lo que pasó hoy, en datos. Ej: «Registraste 2 h 15,
  casi todo en una sola cosa.»
- analisis.sostuvo: qué se mantuvo, con el dato que lo respalda.
- analisis.cayo: qué dejó de aparecer, con cuántos días lleva sin registro.
- analisis.costo: en qué se fue el tiempo que no esperaba. Aquí es donde hay
  que ser más directo, pero siempre con los números delante.
- analisis.seRepite: el patrón que asoma en varios días o audios, si lo hay.
- tareas: como mucho tres, concretas y de un solo paso. Si el día no da para
  ninguna, devuelve la lista vacía. Es mejor ninguna que rellenar.

Si un apartado no tiene datos que lo sostengan, escribe explícitamente que no
hay registro suficiente en vez de inventar algo.
`.trim();

export const ESQUEMA_CIERRE: Esquema = {
  type: "object",
  properties: {
    resumen: { type: "string" },
    analisis: {
      type: "object",
      properties: {
        sostuvo: { type: "string" },
        cayo: { type: "string" },
        costo: { type: "string" },
        seRepite: { type: "string" },
      },
      required: ["sostuvo", "cayo", "costo", "seRepite"],
      propertyOrdering: ["sostuvo", "cayo", "costo", "seRepite"],
    },
    tareas: { type: "array", items: { type: "string" } },
  },
  required: ["resumen", "analisis", "tareas"],
  propertyOrdering: ["resumen", "analisis", "tareas"],
};

export interface RespuestaCierre {
  resumen: string;
  analisis: { sostuvo: string; cayo: string; costo: string; seRepite: string };
  tareas: string[];
}

export function promptDe(tipo: TipoCaptura): string {
  const base = PROMPTS[tipo];
  if (tipo !== "pendiente") return base;
  // Sin la fecha de hoy, «el sábado» no se puede resolver.
  return `${base}\n\nHoy es ${fechaLarga()} (${hoyISO()}).`;
}

export function esquemaDe(tipo: TipoCaptura): Esquema {
  if (tipo === "diario") return ESQUEMA_DIARIO;
  if (tipo === "pendiente") return ESQUEMA_PENDIENTES;
  return esquemaIdea(tipo === "musica");
}
