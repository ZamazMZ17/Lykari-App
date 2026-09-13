import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan, RegistroPlan } from "./db";
const memoria = vi.hoisted(() => ({ plan: undefined as Plan | undefined, registros: [] as RegistroPlan[] }));
vi.mock("./db", () => ({ db: {
  planes: {
    get: async () => memoria.plan,
    update: async (_id: number, cambios: Partial<Plan>) => Object.assign(memoria.plan!, cambios),
  },
  registrosPlan: {
    where: () => ({
      and: (predicado: (r: RegistroPlan) => boolean) => ({ first: async () => memoria.registros.find(predicado) }),
      equals: () => ({ sortBy: async () => memoria.registros }),
    }),
    add: async (r: RegistroPlan) => memoria.registros.push({ ...r, id: 1 }),
    update: async (id: number, cambios: Partial<RegistroPlan>) => Object.assign(memoria.registros.find((r) => r.id === id)!, cambios),
  },
  transaction: async (_modo: string, _planes: unknown, _registros: unknown, accion: () => Promise<void>) => accion(),
} }));
import { guardarAvanceHoy } from "./planes";

beforeEach(() => {
  memoria.plan = { id: 1, actividadId: 1, categoria: "ejercicio", nivelActual: 1, creada: 0 };
  memoria.registros = [];
});

describe("guardar checks con sesión", () => {
  it("crea el registro parcial con el id de la sesión", async () => {
    await guardarAvanceHoy(1, 0, ["Sentadillas"], false, 42);
    expect(memoria.registros[0]).toMatchObject({ sesionId: 42, ejerciciosHechos: ["Sentadillas"], completo: 0 });
  });
  it("vincula un registro previo al marcar desde la sesión y conserva el vínculo desde la hoja", async () => {
    await guardarAvanceHoy(1, 0, ["Sentadillas"], false);
    await guardarAvanceHoy(1, 0, ["Sentadillas", "Plancha"], false, 42);
    await guardarAvanceHoy(1, 0, ["Plancha"], false);
    expect(memoria.registros).toHaveLength(1);
    expect(memoria.registros[0]).toMatchObject({ sesionId: 42, ejerciciosHechos: ["Plancha"] });
  });
  it("permite desmarcar el último ejercicio y conserva el registro vacío", async () => {
    await guardarAvanceHoy(1, 0, ["Sentadillas"], true, 42);
    await guardarAvanceHoy(1, 0, [], false, 42);
    expect(memoria.registros[0]).toMatchObject({ ejerciciosHechos: [], completo: 0, sesionId: 42 });
  });
});
