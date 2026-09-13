import { db } from "../db/db";
import { diaLocal, desplazarDia } from "./presentacion";
import { motorControl, usaMock } from "./servicio";

/** Fotografías locales de la ventana que conserva Android, sin duplicar día/paquete. */
export async function sincronizarUso(): Promise<void> {
  if (usaMock()) return;
  const hoy = diaLocal();
  const { dias } = await motorControl().usoRango({ desde: desplazarDia(hoy, -6), hasta: hoy });
  await db.transaction("rw", db.controlUsoDiario, async () => {
    for (const dia of dias) {
      for (const app of dia.apps) {
        const existentes = await db.controlUsoDiario.where("[dia+paquete]").equals([dia.dia, app.paquete]).toArray();
        // Evita perder datos si Android devuelve una ventana parcial o menor al dato ya fotografiado.
        const ms = Math.max(app.ms, ...existentes.map((r) => r.ms));
        const aperturas = Math.max(app.aperturas, ...existentes.map((r) => r.aperturas));
        await db.controlUsoDiario.where("[dia+paquete]").equals([dia.dia, app.paquete]).delete();
        await db.controlUsoDiario.add({ dia: dia.dia, paquete: app.paquete, ms, aperturas });
      }
    }
  });
}
