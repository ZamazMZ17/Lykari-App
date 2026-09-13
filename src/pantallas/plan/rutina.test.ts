import { describe, expect, it } from "vitest";
import type { Plan, RegistroPlan } from "../../db/db";
import { rutinaDeHoy } from "./rutina";

const plan: Plan = { id: 1, actividadId: 1, categoria: "ejercicio", nivelActual: 1, creada: 0 };
const registro: RegistroPlan = { id: 1, planId: 1, dia: "2026-09-13", nivelNumero: 1,
  diaRutinaIndice: 1, ejerciciosHechos: ["Zancadas hacia atrás"], completo: 0, creada: 0 };

describe("rutina visible del día", () => {
  it("mantiene el día y los checks al volver a abrir un registro parcial", () => {
    const actual = rutinaDeHoy(plan, [registro], registro.dia);
    expect(actual.diaIndice).toBe(1);
    expect(actual.diaRutina.titulo).toBe("Cuerpo completo B");
    expect(actual.registro?.ejerciciosHechos).toEqual(["Zancadas hacia atrás"]);
  });
  it("no cambia los ejercicios de hoy cuando el último check sube de nivel", () => {
    const actual = rutinaDeHoy({ ...plan, nivelActual: 2 }, [{ ...registro, completo: 1 }], registro.dia);
    expect(actual.diaRutina.ejercicios[0].detalle).toBe("3 series x 8 por pierna");
  });
  it("usa el nuevo nivel a partir del día siguiente", () => {
    const actual = rutinaDeHoy({ ...plan, nivelActual: 2 }, [{ ...registro, completo: 1 }], "2026-09-14");
    expect(actual.diaRutina.ejercicios[0].nombre).toBe("Sentadillas con pausa");
    expect(actual.registro).toBeUndefined();
  });
  it("alterna por registros completos y no por días sin registro", () => {
    const actual = rutinaDeHoy(plan, [{ ...registro, completo: 1 }], "2026-09-20");
    expect(actual.diaIndice).toBe(1);
  });
});
