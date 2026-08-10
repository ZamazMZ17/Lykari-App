import { describe, expect, it } from "vitest";
import type { Sesion } from "../db/db";
import {
  AVISO_RECREATIVA,
  HORA,
  LIMITE_ENFOQUE,
  MINUTO,
  cronometro,
  duracionLarga,
  estaPausada,
  instanteAlAcumular,
  msRegistrados,
} from "./tiempo";

const T0 = 1_700_000_000_000;

function sesion(p: Partial<Sesion> = {}): Sesion {
  return {
    id: 1,
    actividadId: 1,
    dia: "2026-07-26",
    inicio: T0,
    fin: null,
    abierta: 1,
    pausas: [],
    cerradaAuto: false,
    audioPendiente: false,
    ...p,
  };
}

describe("msRegistrados", () => {
  it("cuenta el reloj de pared cuando no hubo pausas", () => {
    expect(msRegistrados(sesion(), T0 + 25 * MINUTO)).toBe(25 * MINUTO);
  });

  it("descuenta las pausas ya terminadas", () => {
    const s = sesion({
      pausas: [{ desde: T0 + 10 * MINUTO, hasta: T0 + 15 * MINUTO }],
    });
    expect(msRegistrados(s, T0 + 30 * MINUTO)).toBe(25 * MINUTO);
  });

  it("congela el tiempo mientras la pausa sigue abierta", () => {
    const s = sesion({ pausas: [{ desde: T0 + 10 * MINUTO, hasta: null }] });
    expect(msRegistrados(s, T0 + 20 * MINUTO)).toBe(10 * MINUTO);
    expect(msRegistrados(s, T0 + 90 * MINUTO)).toBe(10 * MINUTO);
  });

  it("no cuenta nada después del fin, aunque el reloj siga", () => {
    const s = sesion({ fin: T0 + 40 * MINUTO, abierta: 0 });
    expect(msRegistrados(s, T0 + 10 * HORA)).toBe(40 * MINUTO);
  });

  it("recorta una pausa que quedó abierta más allá del fin", () => {
    const s = sesion({
      fin: T0 + 30 * MINUTO,
      abierta: 0,
      pausas: [{ desde: T0 + 20 * MINUTO, hasta: T0 + 45 * MINUTO }],
    });
    expect(msRegistrados(s, T0 + 60 * MINUTO)).toBe(20 * MINUTO);
  });

  it("suma varias pausas", () => {
    const s = sesion({
      pausas: [
        { desde: T0 + 10 * MINUTO, hasta: T0 + 12 * MINUTO },
        { desde: T0 + 20 * MINUTO, hasta: T0 + 28 * MINUTO },
      ],
    });
    expect(msRegistrados(s, T0 + 40 * MINUTO)).toBe(30 * MINUTO);
  });

  it("nunca devuelve negativo", () => {
    expect(msRegistrados(sesion(), T0 - 5000)).toBe(0);
  });
});

describe("estaPausada", () => {
  it("solo con una pausa sin cerrar", () => {
    expect(estaPausada(sesion())).toBe(false);
    expect(
      estaPausada(sesion({ pausas: [{ desde: T0 + 1, hasta: T0 + 2 }] })),
    ).toBe(false);
    expect(estaPausada(sesion({ pausas: [{ desde: T0 + 1, hasta: null }] }))).toBe(true);
  });
});

describe("instanteAlAcumular — cierre automático de las actividades de enfoque", () => {
  it("sin pausas, el límite cae a las 3 h exactas del inicio", () => {
    expect(instanteAlAcumular(sesion(), LIMITE_ENFOQUE)).toBe(T0 + 3 * HORA);
  });

  it("una pausa corre el límite justo lo que duró la pausa", () => {
    const s = sesion({ pausas: [{ desde: T0 + HORA, hasta: T0 + HORA + 20 * MINUTO }] });
    expect(instanteAlAcumular(s, LIMITE_ENFOQUE)).toBe(T0 + 3 * HORA + 20 * MINUTO);
  });

  it("una pausa posterior al límite no lo mueve", () => {
    const s = sesion({ pausas: [{ desde: T0 + 5 * HORA, hasta: T0 + 6 * HORA }] });
    expect(instanteAlAcumular(s, LIMITE_ENFOQUE)).toBe(T0 + 3 * HORA);
  });

  it("si sigue pausada antes de llegar al límite, no lo alcanza nunca", () => {
    const s = sesion({ pausas: [{ desde: T0 + HORA, hasta: null }] });
    expect(instanteAlAcumular(s, LIMITE_ENFOQUE)).toBeNull();
  });

  it("una pausa abierta después del límite sí deja calcularlo", () => {
    const s = sesion({ pausas: [{ desde: T0 + 4 * HORA, hasta: null }] });
    expect(instanteAlAcumular(s, LIMITE_ENFOQUE)).toBe(T0 + 3 * HORA);
  });

  it("ordena las pausas aunque lleguen desordenadas", () => {
    const s = sesion({
      pausas: [
        { desde: T0 + 2 * HORA, hasta: T0 + 2 * HORA + 10 * MINUTO },
        { desde: T0 + HORA, hasta: T0 + HORA + 5 * MINUTO },
      ],
    });
    expect(instanteAlAcumular(s, LIMITE_ENFOQUE)).toBe(T0 + 3 * HORA + 15 * MINUTO);
  });

  it("el instante calculado corresponde a exactamente 3 h registradas", () => {
    const s = sesion({
      pausas: [
        { desde: T0 + 30 * MINUTO, hasta: T0 + 50 * MINUTO },
        { desde: T0 + 2 * HORA, hasta: T0 + 2 * HORA + 7 * MINUTO },
      ],
    });
    const t = instanteAlAcumular(s, LIMITE_ENFOQUE)!;
    expect(msRegistrados(s, t)).toBe(LIMITE_ENFOQUE);
  });

  it("el aviso de las recreativas cae a las 2 h", () => {
    expect(instanteAlAcumular(sesion(), AVISO_RECREATIVA)).toBe(T0 + 2 * HORA);
  });
});

describe("formato", () => {
  it("cronómetro en hh:mm:ss", () => {
    expect(cronometro(0)).toBe("00:00:00");
    expect(cronometro(59_999)).toBe("00:00:59");
    expect(cronometro(3 * HORA + 4 * MINUTO + 5000)).toBe("03:04:05");
  });

  it("duración larga legible", () => {
    expect(duracionLarga(42 * MINUTO)).toBe("42 min");
    expect(duracionLarga(60 * MINUTO)).toBe("1 h");
    expect(duracionLarga(85 * MINUTO)).toBe("1 h 25");
  });
});
