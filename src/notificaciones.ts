import { LocalNotifications } from "@capacitor/local-notifications";
import { db } from "./db/db";
import { hayDiarioHoy } from "./db/capturas";
import { aISO, desdeISO, hoyISO, sumarDias, type DiaISO } from "./lib/fecha";
import { esNativo } from "./lib/plataforma";

/**
 * Los recordatorios son del sistema, no de la app: tienen que llegar con
 * Lykari cerrada. Por eso existe el APK.
 *
 * Se programan por adelantado y se vuelven a calcular cada vez que se abre la
 * app, en vez de usar repeticiones: así se puede saltar los días que ya tienen
 * diario sin cancelar la serie entera.
 */

/** Rango reservado para el diario, uno por día. */
const BASE_DIARIO = 1000;
/** Rango reservado para las tareas: id de la tarea + este desplazamiento. */
const BASE_TAREA = 500_000;
const DIAS_PROGRAMADOS = 14;

export const HORA_DIARIO = 20; // 8:00 pm (CLAUDE.md §5)
const HORA_TAREA = 9;

const idDiario = (dia: DiaISO) => BASE_DIARIO + Number(dia.replaceAll("-", "")) % 400_000;

async function permitido(): Promise<boolean> {
  if (!esNativo) return false;
  const estado = await LocalNotifications.checkPermissions();
  if (estado.display === "granted") return true;
  const pedido = await LocalNotifications.requestPermissions();
  return pedido.display === "granted";
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  return permitido();
}

/** Borra todo lo que teníamos programado, para reprogramar desde cero. */
async function limpiarProgramadas(): Promise<void> {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length === 0) return;
  await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
}

/**
 * Reprograma todo. Se llama al abrir la app y al volver a ella; es idempotente.
 * Nunca avisa de un día que ya tiene diario, ni de una tarea ya hecha.
 */
export async function reprogramarRecordatorios(): Promise<number> {
  if (!(await permitido())) return 0;

  await limpiarProgramadas();
  const ahora = Date.now();
  const pendientes: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

  // Diario: a las 8 pm, saltando el de hoy si ya grabó.
  const yaHayDiarioHoy = await hayDiarioHoy();
  for (let i = 0; i < DIAS_PROGRAMADOS; i++) {
    const dia = aISO(sumarDias(new Date(), i));
    if (i === 0 && yaHayDiarioHoy) continue;
    const cuando = desdeISO(dia);
    cuando.setHours(HORA_DIARIO, 0, 0, 0);
    if (cuando.getTime() <= ahora) continue;
    pendientes.push({
      id: idDiario(dia),
      title: "El diario de hoy",
      body: "Cuenta cómo te fue. Un audio corto basta.",
      schedule: { at: cuando, allowWhileIdle: true },
    });
  }

  // Tareas: a la hora que dijo al grabarla, y si no dijo ninguna, por la
  // mañana del día en que vence.
  const tareas = await db.tareas.toArray();
  for (const t of tareas) {
    if (t.hecha || !t.id) continue;

    let cuando: Date;
    if (t.recordatorio) {
      cuando = new Date(t.recordatorio);
    } else if (t.vence) {
      cuando = desdeISO(t.vence);
      cuando.setHours(HORA_TAREA, 0, 0, 0);
    } else {
      continue; // sin fecha no hay nada que avisar
    }

    if (cuando.getTime() <= ahora) continue;
    pendientes.push({
      id: BASE_TAREA + t.id,
      title: t.texto,
      body: t.descripcion ?? "Vence hoy.",
      schedule: { at: cuando, allowWhileIdle: true },
    });
  }

  if (pendientes.length > 0) await LocalNotifications.schedule({ notifications: pendientes });
  return pendientes.length;
}

/** Para mostrar en Ajustes si los avisos están activos de verdad. */
export async function estadoNotificaciones(): Promise<{
  disponible: boolean;
  concedido: boolean;
  programadas: number;
}> {
  if (!esNativo) return { disponible: false, concedido: false, programadas: 0 };
  const estado = await LocalNotifications.checkPermissions();
  const { notifications } = await LocalNotifications.getPending();
  return {
    disponible: true,
    concedido: estado.display === "granted",
    programadas: notifications.length,
  };
}

/** El día lógico de hoy, para que Ajustes pueda decir si falta el diario. */
export const diaDeHoy = hoyISO;
