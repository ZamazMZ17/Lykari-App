import { db, type Cierre, type EstadisticasDia } from "../db/db";
import {
  diasConRegistro,
  diasSinRegistro,
  primerDiaConDatos,
  repartoPorActividad,
  resumenPorDia,
  sesionesDe,
} from "../db/agregados";
import { aISO, desdeISO, hoyISO, sumarDias, type DiaISO } from "../lib/fecha";
import { enMinutos, msRegistrados } from "../lib/tiempo";
import { configuracionIA } from "./ajustes";
import { ErrorIA, pedirJSON } from "./gemini";
import { ESQUEMA_CIERRE, PROMPT_CIERRE, type RespuestaCierre } from "./prompts";

/** Cuántos días atrás se intenta recuperar si la app estuvo cerrada. */
const MAXIMO_DIAS_ATRASADOS = 7;
/** Las tareas del cierre caducan a los 7 días si no se hacen (CLAUDE.md §8). */
const VIDA_TAREA_DIAS = 7;
/** Contexto que acompaña al día para poder hablar de patrones. */
const DIAS_DE_CONTEXTO = 14;

/**
 * Lo que se manda a la API. Solo resúmenes: ningún audio, ninguna transcripción
 * de días pasados. El historial completo se queda en el teléfono para poder
 * cambiar de proveedor sin perder nada (CLAUDE.md §3).
 */
async function construirEnvio(dia: DiaISO) {
  const sesiones = await sesionesDe(dia);
  const actividades = await db.actividades.bulkGet(sesiones.map((s) => s.actividadId));
  const capturas = (await db.capturas.where("fecha").equals(dia).toArray()).filter(
    (c) => c.estado !== "eliminada",
  );

  const detalle = sesiones.map((s, i) => ({
    actividad: actividades[i]?.nombre ?? "Actividad borrada",
    tipo: actividades[i]?.tipo ?? "enfoque",
    minutos: enMinutos(msRegistrados(s)),
    pausas: s.pausas.length,
    cerradaSola: s.cerradaAuto,
    conto: s.transcripcion ?? (s.audioPendiente ? "(dejó el audio pendiente)" : "(no contó nada)"),
  }));

  // El contexto nunca empieza antes del primer día con datos: si no, la IA
  // cuenta como «días sin actividad» días en los que aún no usabas la app.
  const ventana = aISO(sumarDias(desdeISO(dia), -DIAS_DE_CONTEXTO));
  const primero = await primerDiaConDatos();
  const contextoDesde = primero && primero > ventana ? primero : ventana;
  const ayer = aISO(sumarDias(desdeISO(dia), -1));
  const previos = contextoDesde <= ayer ? await resumenPorDia(contextoDesde, ayer) : [];

  const estadisticas: EstadisticasDia = {
    msTotal: sesiones.reduce((a, s) => a + msRegistrados(s), 0),
    sesiones: sesiones.length,
    capturas: capturas.length,
    porActividad: await repartoPorActividad(dia, dia),
  };

  const envio = {
    dia,
    sesiones: detalle,
    diario: capturas.find((c) => c.tipo === "diario")?.descripcion ?? null,
    ideasCapturadas: capturas
      .filter((c) => c.tipo !== "diario")
      .map((c) => ({ tipo: c.tipo, titulo: c.titulo ?? "(sin procesar)" })),
    enElTablonHoy: await diasSinRegistro(dia),
    minutosPorDiaAntes: previos.map((d) => ({ dia: d.dia, minutos: enMinutos(d.ms) })),
  };

  return { envio, estadisticas };
}

/** Cierra un día concreto. Lanza si falla, dejando el error escrito. */
export async function cerrarDia(dia: DiaISO): Promise<Cierre> {
  const config = await configuracionIA();
  if (!config.apiKey) throw new ErrorIA("Falta la API key.");

  const { envio, estadisticas } = await construirEnvio(dia);

  try {
    const r = await pedirJSON<RespuestaCierre>(config, {
      prompt: `${PROMPT_CIERRE}\n\nDatos del día:\n${JSON.stringify(envio, null, 1)}`,
      esquema: ESQUEMA_CIERRE,
    });

    const cierre: Cierre = {
      fecha: dia,
      resumen: r.resumen?.trim() || "Sin resumen.",
      estadisticas,
      analisis: {
        sostuvo: r.analisis?.sostuvo?.trim() || "No hay registro suficiente.",
        cayo: r.analisis?.cayo?.trim() || "No hay registro suficiente.",
        costo: r.analisis?.costo?.trim() || "No hay registro suficiente.",
        seRepite: r.analisis?.seRepite?.trim() || "No hay registro suficiente.",
      },
      creado: Date.now(),
    };
    await db.cierres.put(cierre);

    // Máximo tres, y con fecha de caducidad: una lista que crece sin parar es
    // la misma trampa del horario de 30 días.
    const caduca = aISO(sumarDias(desdeISO(dia), VIDA_TAREA_DIAS));
    for (const texto of (r.tareas ?? []).slice(0, 3)) {
      const limpio = texto.trim();
      if (!limpio) continue;
      await db.tareas.add({
        texto: limpio,
        origenCierre: dia,
        caduca,
        hecha: 0,
        creada: Date.now(),
      });
    }
    return cierre;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Falló el cierre.";
    await db.cierres.put({
      fecha: dia,
      resumen: "",
      estadisticas,
      analisis: { sostuvo: "", cayo: "", costo: "", seRepite: "" },
      creado: Date.now(),
      error: mensaje,
    });
    throw e;
  }
}

/**
 * No hay cron: esto corre al abrir la app. Cierra los días que tienen registro
 * y todavía no tienen análisis, del más viejo al más nuevo. Hoy nunca se
 * cierra: el día no ha terminado.
 */
export async function cerrarDiasPendientes(): Promise<DiaISO[]> {
  const config = await configuracionIA();
  if (!config.apiKey) return [];

  const hoy = hoyISO();
  const desde = aISO(sumarDias(new Date(), -MAXIMO_DIAS_ATRASADOS));
  const ayer = aISO(sumarDias(new Date(), -1));

  const conRegistro = await diasConRegistro(desde, ayer);
  const yaCerrados = await db.cierres.where("fecha").between(desde, ayer, true, true).toArray();
  const hechos = new Set(yaCerrados.filter((c) => !c.error).map((c) => c.fecha));

  const pendientes = [...conRegistro]
    .filter((d) => d !== hoy && !hechos.has(d))
    .sort((a, b) => a.localeCompare(b));

  const cerrados: DiaISO[] = [];
  for (const dia of pendientes) {
    try {
      await cerrarDia(dia);
      cerrados.push(dia);
    } catch {
      // Sin cuota o sin red los siguientes fallarían igual: se reintenta al
      // volver a abrir la app.
      break;
    }
  }
  return cerrados;
}

/** Las tareas del cierre que nadie hizo desaparecen en silencio, sin reproche. */
export async function limpiarTareasCaducadas(hoy: DiaISO = hoyISO()): Promise<number> {
  const todas = await db.tareas.toArray();
  const vencidas = todas.filter((t) => !t.hecha && t.caduca && t.caduca < hoy);
  await db.tareas.bulkDelete(vencidas.map((t) => t.id!));
  return vencidas.length;
}
