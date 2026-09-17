import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan, RegistroPlan, Sesion } from "../db/db";

const memoria = vi.hoisted(() => ({
  sesion: undefined as Sesion | undefined,
  plan: undefined as Plan | undefined,
  registro: undefined as RegistroPlan | undefined,
}));

vi.mock("../db/db", () => ({ db: { sesiones: { get: async () => memoria.sesion } } }));
vi.mock("../db/planes", () => ({
  planDeActividad: async () => memoria.plan,
  registroDeHoy: async () => memoria.registro,
}));

import { evaluarEjercicioParaDesbloqueo, MINIMO_EJERCICIO_MS } from "./ejercicio";

const inicio = new Date("2026-09-16T10:00:00").getTime();

beforeEach(() => {
  memoria.plan = { id: 3, actividadId: 9, categoria: "ejercicio", nivelActual: 1, creada: inicio };
  memoria.registro = { id: 4, planId: 3, dia: "2026-09-16", nivelNumero: 1, diaRutinaIndice: 0, ejerciciosHechos: ["todo"], completo: 1, creada: inicio, sesionId: 7 };
  memoria.sesion = {
    id: 7, actividadId: 9, dia: "2026-09-16", inicio, fin: inicio + MINIMO_EJERCICIO_MS + 1,
    abierta: 0, pausas: [], cerradaAuto: false, audioPendiente: false,
  };
});

describe("puerta por ejercicio", () => {
  it("solo acepta Ejercicio terminado, completo y con más de 40 min activos", async () => {
    await expect(evaluarEjercicioParaDesbloqueo(7)).resolves.toEqual({ elegible: true, sesionId: 7 });
  });

  it("no cuenta exactamente 40 min ni las pausas", async () => {
    memoria.sesion!.fin = inicio + 50 * 60_000;
    memoria.sesion!.pausas = [{ desde: inicio + 5 * 60_000, hasta: inicio + 15 * 60_000 }];
    await expect(evaluarEjercicioParaDesbloqueo(7)).resolves.toMatchObject({ elegible: false, motivo: "tiempo_insuficiente" });
  });

  it("rechaza GymFace y una rutina marcada fuera de esta sesión", async () => {
    memoria.plan!.categoria = "gymface";
    await expect(evaluarEjercicioParaDesbloqueo(7)).resolves.toMatchObject({ elegible: false, motivo: "no_ejercicio" });
    memoria.plan!.categoria = "ejercicio";
    memoria.registro!.sesionId = 8;
    await expect(evaluarEjercicioParaDesbloqueo(7)).resolves.toMatchObject({ elegible: false, motivo: "rutina_incompleta" });
  });
});
