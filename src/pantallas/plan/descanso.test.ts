import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ valor: undefined as string | undefined }));
const avisos = vi.hoisted(() => ({
  avisarDescansoWeb: vi.fn(async () => {}), cancelarAvisoDescanso: vi.fn(async () => {}),
  pedirPermisoNotificaciones: vi.fn(async () => true), programarAvisoDescanso: vi.fn(async () => {}),
}));
vi.mock("../../notificaciones", () => avisos);
vi.mock("dexie", () => ({ liveQuery: () => ({ subscribe: () => {} }) }));
vi.mock("../../ia/ajustes", () => ({
  leerAjuste: async () => estado.valor,
  guardarAjuste: async (_clave: string, valor: string) => { estado.valor = valor; },
}));
vi.mock("../../db/db", () => ({ db: {
  ajustes: { delete: async () => { estado.valor = undefined; } },
  transaction: async (_modo: string, _tabla: unknown, accion: () => Promise<unknown>) => accion(),
} }));
import { cancelarDescanso, iniciarDescanso, leerDescanso, segundosRestantes } from "./descanso";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-13T18:00:00Z"));
  estado.valor = undefined;
  vi.clearAllMocks();
  vi.stubGlobal("document", { hidden: false, addEventListener: vi.fn() });
  vi.stubGlobal("navigator", { vibrate: vi.fn() });
});
afterEach(async () => {
  await cancelarDescanso();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("descanso persistente", () => {
  it("guarda el vencimiento absoluto y lo recupera sin depender de ticks", async () => {
    await iniciarDescanso("Sentadillas", 60);
    expect(await leerDescanso()).toEqual({ nombre: "Sentadillas", terminaEn: Date.now() + 60000 });
    vi.setSystemTime(Date.now() + 23000);
    expect(segundosRestantes(await leerDescanso())).toBe(37);
  });
  it("vence una sola vez y vibra aun sin una vista montada", async () => {
    await iniciarDescanso("Plancha", 2);
    await vi.advanceTimersByTimeAsync(2500);
    expect(await leerDescanso()).toBeNull();
    expect(navigator.vibrate).toHaveBeenCalledExactlyOnceWith(250);
    await vi.advanceTimersByTimeAsync(5000);
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
  });
  it("programa en segundo plano y avisa al vencer", async () => {
    vi.stubGlobal("document", { hidden: true, addEventListener: vi.fn() });
    await iniciarDescanso("Plancha", 2);
    expect(avisos.programarAvisoDescanso).toHaveBeenCalledWith("Plancha", Date.now() + 2000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(avisos.avisarDescansoWeb).toHaveBeenCalledExactlyOnceWith("Plancha");
  });
  it("cancelar elimina el dato y evita el aviso", async () => {
    await iniciarDescanso("Plancha", 2);
    await cancelarDescanso();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await leerDescanso()).toBeNull();
    expect(navigator.vibrate).not.toHaveBeenCalled();
    expect(avisos.cancelarAvisoDescanso).toHaveBeenCalled();
  });
  it("reemplazar un descanso no deja vencer el anterior", async () => {
    await iniciarDescanso("Plancha", 2);
    await iniciarDescanso("Sentadillas", 60);
    await vi.advanceTimersByTimeAsync(3000);
    expect(segundosRestantes(await leerDescanso())).toBe(57);
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });
  it("tolera datos dañados y nunca muestra cuentas negativas", async () => {
    estado.valor = "{roto";
    expect(await leerDescanso()).toBeNull();
    estado.valor = '{"nombre":"Plancha","terminaEn":"ayer"}';
    expect(await leerDescanso()).toBeNull();
    expect(segundosRestantes({ nombre: "Plancha", terminaEn: Date.now() - 1000 })).toBe(0);
  });
});
