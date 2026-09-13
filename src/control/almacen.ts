import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { ESPERA_APAGAR_ADULTO_MS, reglasVacias, type ReglasControl } from "./tipos";
import { motorControl, usaMock } from "./servicio";
import { tablasMock } from "./mock";

export function tablasControl() { return usaMock() ? tablasMock : db; }

export async function leerReglas(): Promise<ReglasControl> {
  return (await tablasControl().controlReglas.get(1))?.reglas ?? reglasVacias();
}

/** La UI no puede acortar la espera ni debilitar las capas de un filtro encendido. */
export function validarCambioFiltro(anterior: ReglasControl, siguiente: ReglasControl, ahora: number): void {
  const a = anterior.filtroAdulto;
  const b = siguiente.filtroAdulto;
  if (!a.activo) return;
  const vencido = a.apagadoPedidoEn !== null && ahora >= a.apagadoPedidoEn + ESPERA_APAGAR_ADULTO_MS;
  if (!b.activo && !vencido) throw new Error("El filtro se apaga al terminar la espera de 24 h.");
  if (b.activo && a.apagadoPedidoEn !== null && b.apagadoPedidoEn !== a.apagadoPedidoEn && b.apagadoPedidoEn !== null) {
    throw new Error("La solicitud de apagado ya tiene una fecha guardada.");
  }
  if (a.apagadoPedidoEn === null && b.apagadoPedidoEn !== null && b.apagadoPedidoEn !== ahora) {
    throw new Error("La espera empieza al confirmar la solicitud.");
  }
  if (!b.activo && vencido) return;
  const conserva = (viejos: string[], nuevos: string[]) => viejos.every((v) => nuevos.includes(v));
  if ((a.dns && !b.dns) || (a.forzarSafeSearch && !b.forzarSafeSearch) ||
      (a.bloquearBusquedaTelegram && !b.bloquearBusquedaTelegram) ||
      !conserva(a.palabras, b.palabras) || !conserva(a.dominios, b.dominios) ||
      !conserva(a.chatsBloqueados, b.chatsBloqueados) ||
      !conserva(b.navegadoresPermitidos, a.navegadoresPermitidos)) {
    throw new Error("Para retirar una capa o un bloqueo, solicita primero el apagado del filtro.");
  }
}

// Serializa escrituras de esta instancia; se rechazan formularios abiertos sobre una versión antigua.
let escritura: Promise<void> = Promise.resolve();
export function guardarReglas(reglas: ReglasControl): Promise<void> {
  const operacion = escritura.then(async () => {
    const tabla = tablasControl().controlReglas;
    const fila = await tabla.get(1);
    if (fila && fila.reglas.actualizado !== reglas.actualizado) {
      throw new Error("Las reglas cambiaron. Cierra y vuelve a abrir este formulario.");
    }
    const ahora = Date.now();
    const nuevas = structuredClone(reglas);
    // El formulario señala la solicitud; el almacén fija la fecha al guardar.
    if (nuevas.filtroAdulto.apagadoPedidoEn !== null && (fila?.reglas.filtroAdulto.apagadoPedidoEn ?? null) === null) {
      nuevas.filtroAdulto.apagadoPedidoEn = ahora;
    }
    validarCambioFiltro(fila?.reglas ?? reglasVacias(), nuevas, ahora);
    nuevas.actualizado = Math.max(ahora, (fila?.reglas.actualizado ?? 0) + 1);
    // No anunciar un cambio local como aplicado si Android rechaza la operación.
    await motorControl().guardarReglas({ reglas: nuevas });
    await tabla.put({ id: 1, reglas: nuevas });
  });
  escritura = operacion.catch(() => {});
  return operacion;
}

export function useReglas() {
  return useLiveQuery(async () => {
    try { return { reglas: await leerReglas(), error: "" }; }
    catch { return { reglas: undefined, error: "No se pudieron leer las reglas guardadas." }; }
  }, []);
}
