import { liveQuery } from "dexie";
import { db } from "../../db/db";
import { leerAjuste, guardarAjuste } from "../../ia/ajustes";
import { avisarDescansoWeb, cancelarAvisoDescanso, pedirPermisoNotificaciones, programarAvisoDescanso } from "../../notificaciones";

export const CLAVE_DESCANSO = "descansoActivo";
export interface DescansoActivo { nombre: string; terminaEn: number }

export async function leerDescanso(): Promise<DescansoActivo | null> {
  const valor = await leerAjuste(CLAVE_DESCANSO);
  if (!valor) return null;
  try {
    const dato = JSON.parse(valor);
    return dato && typeof dato.nombre === "string" && Number.isFinite(dato.terminaEn)
      ? { nombre: dato.nombre, terminaEn: dato.terminaEn } : null;
  } catch { return null; }
}

export function segundosRestantes(descanso: DescansoActivo | null | undefined, ahora = Date.now()): number {
  return descanso ? Math.max(0, Math.ceil((descanso.terminaEn - ahora) / 1000)) : 0;
}

// Las operaciones nativas se serializan: un cancelar anterior no puede borrar
// el aviso de un descanso recién iniciado, ni dos vistas emitir dos avisos.
let cola: Promise<unknown> = Promise.resolve();
function serializar<T>(accion: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(accion);
  cola = siguiente.catch(() => undefined);
  return siguiente;
}
let temporizador: ReturnType<typeof setTimeout> | undefined;
let observando = false;
const avisoSeguro = (accion: Promise<unknown>) => accion.catch(() => undefined);

async function actualizarMonitor(): Promise<void> {
  clearTimeout(temporizador);
  const descanso = await leerDescanso();
  if (!descanso) return;
  const restante = descanso.terminaEn - Date.now();
  if (restante <= 0) {
    // Reclamar el vencimiento en una transacción evita duplicados entre pestañas.
    const terminado = await db.transaction("rw", db.ajustes, async () => {
      const actual = await leerDescanso();
      if (!actual || actual.terminaEn !== descanso.terminaEn || actual.nombre !== descanso.nombre) return false;
      await db.ajustes.delete(CLAVE_DESCANSO);
      return true;
    });
    if (terminado) {
      if (typeof navigator !== "undefined") navigator.vibrate?.(250);
      if (document.hidden) await avisoSeguro(avisarDescansoWeb(descanso.nombre));
    }
    return;
  }
  if (document.hidden) await avisoSeguro(programarAvisoDescanso(descanso.nombre, descanso.terminaEn));
  else await avisoSeguro(cancelarAvisoDescanso());
  temporizador = setTimeout(() => { void avisoSeguro(serializar(actualizarMonitor)); }, Math.min(restante, 2_147_483_647));
}

/** Vive fuera de React: salir a Hoy no detiene el descanso. */
export function observarDescanso(): void {
  if (observando || typeof document === "undefined") return;
  observando = true;
  liveQuery(leerDescanso).subscribe({ next: () => { void avisoSeguro(serializar(actualizarMonitor)); } });
  document.addEventListener("visibilitychange", () => { void avisoSeguro(serializar(actualizarMonitor)); });
}

export async function iniciarDescanso(nombre: string, segundos: number): Promise<void> {
  if (!nombre.trim() || !Number.isFinite(segundos) || segundos <= 0) return;
  observarDescanso();
  // El permiso se solicita por una acción del usuario, nunca al pasar a segundo plano.
  void avisoSeguro(pedirPermisoNotificaciones().then(() => serializar(actualizarMonitor)));
  await serializar(async () => {
    await avisoSeguro(cancelarAvisoDescanso());
    await guardarAjuste(CLAVE_DESCANSO, JSON.stringify({ nombre, terminaEn: Date.now() + segundos * 1000 }));
    await actualizarMonitor();
  });
}

export async function cancelarDescanso(): Promise<void> {
  await serializar(async () => {
    await db.ajustes.delete(CLAVE_DESCANSO);
    await avisoSeguro(cancelarAvisoDescanso());
    await actualizarMonitor();
  });
}

// También recupera un descanso si se recarga la app y abre inicialmente en Hoy.
observarDescanso();
