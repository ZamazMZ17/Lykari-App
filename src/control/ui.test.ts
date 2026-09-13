import { describe, expect, it } from "vitest";
import { horarioAhora, normalizarDominio, sumarUso } from "./presentacion";
import { validarCambioFiltro } from "./almacen";
import { ESPERA_APAGAR_ADULTO_MS, reglasVacias } from "./tipos";

describe("Presentación de horarios", () => {
  const viernes = { dias: [5] as [5], desde: "23:00", hasta: "07:00" };
  it("atribuye la madrugada al día que inició el horario", () => {
    expect(horarioAhora(viernes, new Date("2026-09-11T23:30:00"))).toBe(true);
    expect(horarioAhora(viernes, new Date("2026-09-12T06:59:00"))).toBe(true);
    expect(horarioAhora(viernes, new Date("2026-09-12T07:00:00"))).toBe(false);
    expect(horarioAhora(viernes, new Date("2026-09-11T06:00:00"))).toBe(false);
  });
  it("trata días vacíos como todos y excluye el fin", () => {
    const horario = { dias: [], desde: "09:00", hasta: "10:00" };
    expect(horarioAhora(horario, new Date("2026-09-13T09:00:00"))).toBe(true);
    expect(horarioAhora(horario, new Date("2026-09-13T10:00:00"))).toBe(false);
  });
});

describe("Filtro: espera y capas", () => {
  const ahora = 100_000_000;
  function activas() { const r = reglasVacias(ahora); r.filtroAdulto.activo = true; return r; }
  it("rechaza apagar antes de las 24 h y acepta el límite exacto", () => {
    const a = activas(); a.filtroAdulto.apagadoPedidoEn = ahora;
    const b = structuredClone(a); b.filtroAdulto.activo = false;
    expect(() => validarCambioFiltro(a, b, ahora + ESPERA_APAGAR_ADULTO_MS - 1)).toThrow();
    expect(() => validarCambioFiltro(a, b, ahora + ESPERA_APAGAR_ADULTO_MS)).not.toThrow();
  });
  it("rechaza apagar sin solicitud y no permite adelantarla", () => {
    const a = activas(); const b = structuredClone(a); b.filtroAdulto.activo = false;
    expect(() => validarCambioFiltro(a, b, ahora)).toThrow();
    a.filtroAdulto.apagadoPedidoEn = ahora;
    b.filtroAdulto.activo = true; b.filtroAdulto.apagadoPedidoEn = ahora - 1;
    expect(() => validarCambioFiltro(a, b, ahora)).toThrow();
  });
  it("no permite retirar capas, palabras o ampliar navegadores mientras está activo", () => {
    const a = activas(); a.filtroAdulto.palabras = ["ejemplo"];
    for (const cambio of [{ dns: false }, { forzarSafeSearch: false }, { palabras: [] }, { navegadoresPermitidos: ["com.android.chrome", "otro.browser"] }]) {
      const b = structuredClone(a); Object.assign(b.filtroAdulto, cambio);
      expect(() => validarCambioFiltro(a, b, ahora)).toThrow();
    }
  });
  it("permite reforzar el filtro y cancelar el apagado", () => {
    const a = activas(); a.filtroAdulto.apagadoPedidoEn = ahora;
    const b = structuredClone(a); b.filtroAdulto.palabras = ["ejemplo"]; b.filtroAdulto.apagadoPedidoEn = null;
    expect(() => validarCambioFiltro(a, b, ahora)).not.toThrow();
  });
});

describe("Datos presentados", () => {
  it("suma el uso y las aperturas por paquete", () => {
    expect(sumarUso([{ paquete: "a", ms: 5, aperturas: 1 }, { paquete: "b", ms: 2, aperturas: 1 }, { paquete: "a", ms: 3, aperturas: 4 }])).toEqual([
      { paquete: "a", ms: 8, aperturas: 5 }, { paquete: "b", ms: 2, aperturas: 1 },
    ]);
  });
  it("normaliza dominios sin almacenar URLs completas", () => {
    expect(normalizarDominio(" Instagram.COM ")).toBe("instagram.com");
    for (const entrada of ["https://instagram.com", "instagram.com/chat", "instagram.com?token=abc", "*.com", "-mal.com"]) {
      expect(() => normalizarDominio(entrada)).toThrow();
    }
  });
});
