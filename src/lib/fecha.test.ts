import { describe, expect, it } from "vitest";
import {
  aISO,
  diasEntre,
  fechaCorta,
  fechaLarga,
  finDeAlcance,
  indiceSemana,
  mesYAno,
  msHastaMedianoche,
  numeroSemana,
} from "./fecha";

// Domingo 26 de julio de 2026, mediodía.
const DOM = new Date(2026, 6, 26, 12, 0, 0);
// Miércoles 15 de julio de 2026.
const MIE = new Date(2026, 6, 15, 9, 30, 0);

describe("indiceSemana — la semana empieza en lunes", () => {
  it("lunes es 0 y domingo es 6", () => {
    expect(indiceSemana(new Date(2026, 6, 20))).toBe(0); // lunes
    expect(indiceSemana(MIE)).toBe(2);
    expect(indiceSemana(DOM)).toBe(6);
  });
});

describe("finDeAlcance", () => {
  it("«solo hoy» termina el mismo día", () => {
    expect(finDeAlcance("hoy", MIE)).toBe("2026-07-15");
  });

  it("«toda la semana» llega hasta el domingo de esa semana", () => {
    expect(finDeAlcance("semana", MIE)).toBe("2026-07-19");
  });

  it("creada en domingo, la semana termina ese mismo domingo", () => {
    expect(finDeAlcance("semana", DOM)).toBe("2026-07-26");
  });

  it("«todo el mes» llega al último día del mes", () => {
    expect(finDeAlcance("mes", MIE)).toBe("2026-07-31");
  });

  it("respeta meses cortos y años bisiestos", () => {
    expect(finDeAlcance("mes", new Date(2026, 1, 3))).toBe("2026-02-28");
    expect(finDeAlcance("mes", new Date(2028, 1, 3))).toBe("2028-02-29");
  });

  it("una semana a caballo entre dos meses no se corta", () => {
    // Jueves 30 de julio de 2026 → domingo 2 de agosto.
    expect(finDeAlcance("semana", new Date(2026, 6, 30))).toBe("2026-08-02");
  });
});

describe("aISO", () => {
  it("usa la fecha local, no UTC", () => {
    // 23:30 local nunca debe caer en el día siguiente.
    expect(aISO(new Date(2026, 6, 26, 23, 30))).toBe("2026-07-26");
    expect(aISO(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});

describe("fechaLarga", () => {
  it("da el eyebrow de la pantalla Hoy", () => {
    expect(fechaLarga(DOM)).toBe("Domingo 26 de julio");
    expect(fechaLarga(MIE)).toBe("Miércoles 15 de julio");
  });
});

describe("diasEntre — el vencimiento de las tareas", () => {
  it("cuenta días naturales en ambos sentidos", () => {
    expect(diasEntre("2026-07-26", "2026-07-26")).toBe(0);
    expect(diasEntre("2026-07-26", "2026-07-27")).toBe(1);
    expect(diasEntre("2026-07-26", "2026-07-24")).toBe(-2);
  });

  it("cruza meses y años", () => {
    expect(diasEntre("2026-07-31", "2026-08-01")).toBe(1);
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("no se desfasa con el cambio de horario", () => {
    // Si se compararan instantes en vez de días, una noche de 23 o 25 horas
    // haría que «mañana» se leyera como «hoy».
    expect(diasEntre("2026-03-28", "2026-03-29")).toBe(1);
    expect(diasEntre("2026-10-24", "2026-10-25")).toBe(1);
  });
});

describe("fechaCorta", () => {
  it("da día de la semana, número y mes", () => {
    expect(fechaCorta("2026-07-25")).toBe("sáb 25 jul");
    expect(fechaCorta("2026-01-05")).toBe("lun 5 ene");
  });
});

describe("numeroSemana — el riel de semanas del camino", () => {
  it("todos los días de una misma semana dan el mismo número", () => {
    const semana = ["2026-07-20", "2026-07-22", "2026-07-26"].map(numeroSemana);
    expect(new Set(semana).size).toBe(1);
  });

  it("el domingo y el lunes siguiente son semanas distintas y consecutivas", () => {
    expect(numeroSemana("2026-07-27")).toBe(numeroSemana("2026-07-26") + 1);
  });

  it("el 1 de enero cae en la semana que le corresponde por su jueves", () => {
    // 2026-01-01 es jueves, así que arrastra su semana al año nuevo.
    expect(numeroSemana("2026-01-01")).toBe(1);
  });
});

describe("mesYAno", () => {
  it("da el pie del riel", () => {
    expect(mesYAno("2026-07-26")).toBe("julio 2026");
    expect(mesYAno("2027-01-03")).toBe("enero 2027");
  });
});

describe("msHastaMedianoche", () => {
  it("mide lo que falta para el cambio de día", () => {
    expect(msHastaMedianoche(new Date(2026, 6, 26, 23, 0, 0))).toBe(60 * 60 * 1000);
    expect(msHastaMedianoche(new Date(2026, 6, 26, 0, 0, 0))).toBe(24 * 60 * 60 * 1000);
  });
});
