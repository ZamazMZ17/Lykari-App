import { describe, expect, it } from "vitest";
import { agruparPorMes, agruparPorSemana, type ResumenDiario } from "./agregados";
import { MINUTO } from "../lib/tiempo";

const d = (dia: string, min: number, sesiones = 1): ResumenDiario => ({
  dia,
  ms: min * MINUTO,
  sesiones: min > 0 ? sesiones : 0,
});

describe("agruparPorSemana", () => {
  it("junta de lunes a domingo", () => {
    // 2026-07-20 es lunes; 2026-07-26 es domingo.
    const r = agruparPorSemana([
      d("2026-07-20", 30),
      d("2026-07-22", 45),
      d("2026-07-26", 15),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].dia).toBe("2026-07-20");
    expect(r[0].ms).toBe(90 * MINUTO);
    expect(r[0].sesiones).toBe(3);
  });

  it("separa el domingo del lunes siguiente", () => {
    const r = agruparPorSemana([d("2026-07-26", 20), d("2026-07-27", 40)]);
    expect(r.map((x) => x.dia)).toEqual(["2026-07-20", "2026-07-27"]);
    expect(r[0].ms).toBe(20 * MINUTO);
    expect(r[1].ms).toBe(40 * MINUTO);
  });

  it("una semana a caballo entre dos meses sigue siendo una", () => {
    const r = agruparPorSemana([d("2026-07-30", 10), d("2026-08-02", 25)]);
    expect(r).toHaveLength(1);
    expect(r[0].ms).toBe(35 * MINUTO);
  });

  it("los días vacíos no desaparecen del total de sesiones", () => {
    const r = agruparPorSemana([d("2026-07-20", 0), d("2026-07-21", 60)]);
    expect(r[0].sesiones).toBe(1);
    expect(r[0].ms).toBe(60 * MINUTO);
  });

  it("devuelve las semanas en orden", () => {
    const r = agruparPorSemana([d("2026-08-03", 10), d("2026-07-20", 10), d("2026-07-27", 10)]);
    expect(r.map((x) => x.dia)).toEqual(["2026-07-20", "2026-07-27", "2026-08-03"]);
  });
});

describe("agruparPorMes", () => {
  it("junta por mes natural", () => {
    const r = agruparPorMes([d("2026-07-01", 30), d("2026-07-31", 30), d("2026-08-01", 10)]);
    expect(r.map((x) => x.dia)).toEqual(["2026-07-01", "2026-08-01"]);
    expect(r[0].ms).toBe(60 * MINUTO);
    expect(r[1].ms).toBe(10 * MINUTO);
  });

  it("cruza el cambio de año", () => {
    const r = agruparPorMes([d("2026-12-31", 20), d("2027-01-01", 20)]);
    expect(r.map((x) => x.dia)).toEqual(["2026-12-01", "2027-01-01"]);
  });

  it("no inventa meses que no tienen registro", () => {
    expect(agruparPorMes([])).toEqual([]);
  });
});
