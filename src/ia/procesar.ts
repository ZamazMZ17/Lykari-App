import { db, type Captura } from "../db/db";
import { crearTarea } from "../db/capturas";
import { configuracionIA } from "./ajustes";
import { aBase64, aWavMono16k } from "./audio";
import { ErrorIA, pedirJSON } from "./gemini";
import {
  esquemaDe,
  promptDe,
  type RespuestaDiario,
  type RespuestaIdea,
  type RespuestaPendientes,
} from "./prompts";

/** Formato AAAA-MM-DD; la IA a veces devuelve otra cosa y no queremos guardarla. */
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** HH:MM en 24 horas. */
const ES_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Si dijo la hora («a las 8 de la mañana»), el aviso va a esa hora. Sin eso,
 * el recordatorio caería en la hora por defecto y llegaría tarde.
 */
function instanteDelAviso(vence: string, hora: string): number | undefined {
  if (!ES_FECHA.test(vence) || !ES_HORA.test(hora)) return undefined;
  const [a, m, d] = vence.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min, 0, 0).getTime();
}

function limpio(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Procesa una captura ya guardada. Nunca borra el audio ni la transcripción
 * previa: si algo falla, deja el error escrito y la captura sigue en `nueva`
 * para poder reintentar.
 */
export async function procesarCaptura(id: number): Promise<void> {
  const captura = await db.capturas.get(id);
  if (!captura) return;
  if (captura.estado === "eliminada") return;

  const config = await configuracionIA();
  if (!config.apiKey) {
    await db.capturas.update(id, { error: "Falta la API key." });
    throw new ErrorIA("Falta la API key.");
  }

  try {
    const audio = captura.audioBlob
      ? {
          base64: await aBase64(await aWavMono16k(captura.audioBlob)),
          mimeType: "audio/wav",
        }
      : undefined;

    // Sin audio (captura escrita), el texto va dentro del prompt.
    const prompt = audio
      ? promptDe(captura.tipo)
      : `${promptDe(captura.tipo)}\n\nEn vez de audio, esto es lo que escribió:\n"""\n${captura.transcripcion ?? ""}\n"""`;

    const datos = await pedirJSON<unknown>(config, {
      prompt,
      esquema: esquemaDe(captura.tipo),
      audio,
    });

    await guardarResultado(captura, datos);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Falló el procesamiento.";
    await db.capturas.update(id, { error: mensaje });
    throw e;
  }
}

async function guardarResultado(captura: Captura, datos: unknown): Promise<void> {
  const id = captura.id!;
  const base = { estado: "procesada" as const, error: undefined, procesadaEn: Date.now() };

  if (captura.tipo === "diario") {
    const r = datos as RespuestaDiario;
    await db.capturas.update(id, {
      ...base,
      transcripcion: limpio(r.transcripcion) || captura.transcripcion,
      descripcion: limpio(r.texto),
    });
    return;
  }

  if (captura.tipo === "pendiente") {
    const r = datos as RespuestaPendientes;
    const lista = Array.isArray(r.tareas) ? r.tareas : [];
    await db.capturas.update(id, {
      ...base,
      transcripcion: limpio(r.transcripcion) || captura.transcripcion,
      titulo:
        lista.length === 0
          ? "No salió ninguna tarea de este audio"
          : lista.map((t) => limpio(t.texto)).join(" · "),
    });
    // Reprocesar tiene que reemplazar, no acumular: si no, cada reintento
    // vuelve a crear las mismas tareas y la lista se llena de duplicados.
    const previas = await db.tareas.where("origenCapturaId").equals(id).toArray();
    await db.tareas.bulkDelete(previas.filter((t) => !t.hecha).map((t) => t.id!));

    for (const t of lista) {
      const texto = limpio(t.texto);
      if (!texto) continue;
      const vence = limpio(t.vence);
      await crearTarea({
        texto,
        descripcion: limpio(t.descripcion) || undefined,
        origenCapturaId: id,
        vence: ES_FECHA.test(vence) ? vence : undefined,
        recordatorio: instanteDelAviso(vence, limpio(t.hora)),
      });
    }
    return;
  }

  const r = datos as RespuestaIdea;
  await db.capturas.update(id, {
    ...base,
    transcripcion: limpio(r.transcripcion) || captura.transcripcion,
    titulo: limpio(r.titulo) || "Sin título",
    descripcion: limpio(r.descripcion),
    estructura: limpio(r.estructura) || undefined,
    tipoCancion: limpio(r.tipoCancion) || undefined,
  });
}

/**
 * Reintenta todas las que quedaron pendientes. Se llama al guardar la key y al
 * volver a la app, para que nada se quede colgado sin que el usuario lo pida.
 */
export async function procesarPendientes(): Promise<{ hechas: number; fallidas: number }> {
  const config = await configuracionIA();
  if (!config.apiKey) return { hechas: 0, fallidas: 0 };

  const nuevas = await db.capturas.where("estado").equals("nueva").toArray();
  let hechas = 0;
  let fallidas = 0;
  for (const c of nuevas.sort((a, b) => a.creada - b.creada)) {
    try {
      await procesarCaptura(c.id!);
      hechas++;
    } catch {
      fallidas++;
      // Un fallo de cuota o de red hará fallar al resto igual: no insistimos.
      break;
    }
  }
  return { hechas, fallidas };
}
