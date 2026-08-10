import { describe, expect, it } from "vitest";
import { calcularRacha, largoBufanda } from "./racha";

/** 2026-07-06 es lunes. Todos los casos parten de ahí para poder razonar. */
const LUN = "2026-07-06";

const dias = (...isos: string[]) => new Set(isos);
const rango = (desde: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

describe("calcularRacha — cuenta días con registro, no días perfectos", () => {
  it("días seguidos suman", () => {
    const r = calcularRacha(dias(...rango(LUN, 5)), LUN, "2026-07-10");
    expect(r.dias).toBe(5);
    expect(r.ultimoDiaConRegistro).toBe("2026-07-10");
  });

  it("un día libre en la semana no rompe la racha", () => {
    // lun, mar, (mié libre), jue
    const r = calcularRacha(dias("2026-07-06", "2026-07-07", "2026-07-09"), LUN, "2026-07-09");
    expect(r.dias).toBe(3);
  });

  it("dos días seguidos sin registro sí la rompen", () => {
    const r = calcularRacha(dias("2026-07-06", "2026-07-07", "2026-07-10"), LUN, "2026-07-10");
    expect(r.dias).toBe(1);
  });

  it("dos libres separados en la misma semana también la rompen", () => {
    // lun, (mar libre), mié, (jue: ya no queda libre), vie
    const r = calcularRacha(
      dias("2026-07-06", "2026-07-08", "2026-07-10"),
      LUN,
      "2026-07-10",
    );
    expect(r.dias).toBe(1);
  });

  it("el día libre se recupera al empezar otra semana", () => {
    // dom 12 libre (semana 1) y lun 13 con registro; mar 14 libre (semana 2)
    const r = calcularRacha(
      dias(...rango(LUN, 6), "2026-07-13", "2026-07-15"),
      LUN,
      "2026-07-15",
    );
    expect(r.dias).toBe(8);
  });
});

describe("los nudos son permanentes", () => {
  it("cada siete días ganados dejan un nudo", () => {
    const r = calcularRacha(dias(...rango(LUN, 14)), LUN, "2026-07-19");
    expect(r.dias).toBe(14);
    expect(r.nudos).toBe(2);
  });

  it("romper la racha no borra los nudos ya ganados", () => {
    // 7 días, dos vacíos seguidos, y 2 días más
    const registro = dias(...rango(LUN, 7), "2026-07-15", "2026-07-16");
    const r = calcularRacha(registro, LUN, "2026-07-16");
    expect(r.dias).toBe(2);
    expect(r.nudos).toBe(1);
  });

  it("una racha nueva sigue sumando nudos sobre los viejos", () => {
    const registro = dias(...rango(LUN, 7), ...rango("2026-07-15", 7));
    const r = calcularRacha(registro, LUN, "2026-07-21");
    expect(r.nudos).toBe(2);
  });
});

describe("hoy nunca cuenta como fallo", () => {
  it("un hoy sin registro deja la racha intacta", () => {
    const r = calcularRacha(dias(...rango(LUN, 3)), LUN, "2026-07-09");
    expect(r.dias).toBe(3);
    expect(r.hoyRegistrado).toBe(false);
  });

  it("y avisa cuando hoy sí tiene registro", () => {
    const r = calcularRacha(dias(...rango(LUN, 4)), LUN, "2026-07-09");
    expect(r.hoyRegistrado).toBe(true);
  });
});

describe("sin datos", () => {
  it("no inventa una racha", () => {
    const r = calcularRacha(new Set(), LUN, "2026-07-20");
    expect(r).toMatchObject({ dias: 0, nudos: 0, ultimoDiaConRegistro: null });
  });
});

describe("largoBufanda", () => {
  it("crece con la racha y se topa", () => {
    expect(largoBufanda(0)).toBe(20);
    expect(largoBufanda(10)).toBeCloseTo(51);
    expect(largoBufanda(100)).toBe(96);
  });
});
