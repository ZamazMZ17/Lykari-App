import { useLiveQuery } from "dexie-react-hooks";
import { KeyRound, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { db } from "../db/db";
import {
  agruparPorMes,
  agruparPorSemana,
  repartoPorActividad,
  resumenPorDia,
  type ResumenDiario,
} from "../db/agregados";
import { cerrarDia } from "../ia/cierre";
import {
  aISO,
  desdeISO,
  fechaCorta,
  hoyISO,
  mesCorto,
  mesYAno,
  numeroSemana,
  sumarDias,
  type DiaISO,
} from "../lib/fecha";
import { HORA, MINUTO, duracionLarga } from "../lib/tiempo";
import { Anillo, Header } from "../ui/piezas";

type Zoom = "dia" | "semana" | "mes";

const DIAS_A_LA_VISTA = 90;

const COLORES_REPARTO = [
  "var(--pino)",
  "var(--video)",
  "var(--negocio)",
  "var(--musica)",
  "var(--diario)",
  "var(--pend)",
];

export function Camino({ tieneKey, amplia }: { tieneKey: boolean; amplia?: boolean }) {
  const [zoom, setZoom] = useState<Zoom>("dia");
  const [sel, setSel] = useState<DiaISO>(hoyISO);
  const riel = useRef<HTMLDivElement>(null);

  const hoy = hoyISO();
  const desde = aISO(sumarDias(new Date(), -DIAS_A_LA_VISTA));
  const dias = useLiveQuery(() => resumenPorDia(desde, hoy), [desde, hoy], []);

  const datos: ResumenDiario[] =
    zoom === "dia" ? dias : zoom === "semana" ? agruparPorSemana(dias) : agruparPorMes(dias);

  // Al cambiar de zoom, el riel se va al periodo actual: es donde se está.
  useEffect(() => {
    if (riel.current) riel.current.scrollLeft = riel.current.scrollWidth;
  }, [zoom, datos.length]);

  // El periodo seleccionado, traducido al rango que hay que sumar.
  const rango = rangoDe(zoom, sel);
  const reparto = useLiveQuery(
    () => repartoPorActividad(rango.desde, rango.hasta),
    [rango.desde, rango.hasta],
    [],
  );
  const cierre = useLiveQuery(
    async () => (zoom === "dia" ? await db.cierres.get(sel) : undefined),
    [sel, zoom],
  );

  const seleccionado = datos.find((d) => enRango(d.dia, rango, zoom));
  const msPeriodo = seleccionado?.ms ?? 0;

  // El anillo se llena contra el mejor periodo a la vista, con un mínimo para
  // que un día flojo no parezca lleno. Nunca contra una meta: no hay metas.
  const tope = Math.max(...datos.map((d) => d.ms), zoom === "dia" ? HORA : 4 * HORA);
  const tamano = zoom === "dia" ? 38 : zoom === "semana" ? 30 : 44;

  return (
    <div style={{ paddingBottom: 20 }}>
      <Header eyebrow="Tu registro en el tiempo" title="El camino" />

      <div style={{ display: "flex", gap: 6, padding: "4px 20px 14px" }}>
        {(
          [
            ["dia", "Días"],
            ["semana", "Semanas"],
            ["mes", "Meses"],
          ] as [Zoom, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            className="btn"
            onClick={() => {
              setZoom(k);
              setSel(hoy);
            }}
            aria-pressed={zoom === k}
            style={{
              flex: 1,
              maxWidth: amplia ? 160 : undefined,
              padding: "8px 0",
              borderRadius: 9,
              fontSize: 12.5,
              border: `1px solid ${zoom === k ? "var(--ink)" : "var(--line)"}`,
              background: zoom === k ? "var(--ink)" : "transparent",
              color: zoom === k ? "var(--paper)" : "var(--ink2)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div ref={riel} className="noscroll" style={{ overflowX: "auto", padding: "0 20px 4px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: zoom === "semana" ? 6 : 9,
            position: "relative",
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: tamano / 2,
              height: 1,
              background: "var(--line)",
            }}
          />
          {datos.map((p) => {
            const activo = enRango(p.dia, rango, zoom);
            const vacio = p.ms === 0;
            return (
              <button
                key={p.dia}
                className="btn"
                onClick={() => setSel(p.dia)}
                aria-label={`${etiquetaLarga(zoom, p.dia)}: ${duracionLarga(p.ms)}`}
                style={{ position: "relative", flexShrink: 0, textAlign: "center" }}
              >
                <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
                  <Anillo
                    v={p.ms}
                    meta={tope}
                    size={tamano}
                    color={vacio ? "var(--line)" : activo ? "var(--ambar)" : "var(--pino)"}
                    fondo="var(--ground)"
                  />
                  <span
                    className="mono"
                    style={{
                      position: "absolute",
                      fontSize: zoom === "semana" ? 8.5 : 10.5,
                      fontWeight: activo ? 700 : 400,
                      color: vacio ? "var(--ink2)" : "var(--ink)",
                    }}
                  >
                    {etiquetaCorta(zoom, p.dia)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="eyebrow" style={{ padding: "2px 20px 16px" }}>
        {zoom === "dia"
          ? `${mesYAno(sel)} · el relleno es tiempo registrado`
          : zoom === "semana"
            ? "semanas · lunes a domingo"
            : "meses"}
      </div>

      <div
        style={{
          padding: "0 20px",
          display: "grid",
          gap: 8,
          gridTemplateColumns: amplia ? "1fr 1fr" : undefined,
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: "16px 17px" }}>
          {/* Sobre el inicio del periodo, no sobre el día que se tocó: una
              semana empieza el lunes aunque hayas tocado el domingo. */}
          <div className="eyebrow">{etiquetaLarga(zoom, rango.desde)}</div>
          <h3 className="disp disp-19" style={{ fontSize: 19, margin: "6px 0 14px", lineHeight: 1.2 }}>
            {msPeriodo > 0
              ? cierre?.resumen || `Registraste ${duracionLarga(msPeriodo)}.`
              : "No hay registro en este periodo."}
          </h3>

          {zoom !== "dia" ? (
            <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55, margin: 0 }}>
              El análisis se escribe por día. Cambia a «Días» y toca uno para leerlo.
            </p>
          ) : (
            <AnalisisDelDia dia={sel} hoy={hoy} msDia={msPeriodo} tieneKey={tieneKey} />
          )}
        </div>

        <div className="card" style={{ padding: "16px 17px" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            {zoom === "dia" ? "Reparto del día" : zoom === "semana" ? "Reparto de la semana" : "Reparto del mes"}
          </div>
          {reparto.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink2)", margin: 0 }}>
              Nada registrado en este periodo.
            </p>
          ) : (
            reparto.map((r, i) => {
              const max = reparto[0].ms || 1;
              return (
                <div key={r.nombre} style={{ marginBottom: 11 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 12.5,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.nombre}
                    </span>
                    <span className="mono" style={{ color: "var(--ink2)", flexShrink: 0 }}>
                      {Math.round(r.ms / MINUTO)} min
                    </span>
                  </div>
                  <div style={{ height: 5, background: "var(--line)", borderRadius: 3 }}>
                    <div
                      style={{
                        width: `${(r.ms / max) * 100}%`,
                        height: "100%",
                        background: COLORES_REPARTO[i % COLORES_REPARTO.length],
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── el análisis de un día ───────────────────────────────────────── */

function AnalisisDelDia({
  dia,
  hoy,
  msDia,
  tieneKey,
}: {
  dia: DiaISO;
  hoy: DiaISO;
  msDia: number;
  tieneKey: boolean;
}) {
  const [corriendo, setCorriendo] = useState(false);
  const cierre = useLiveQuery(() => db.cierres.get(dia), [dia]);

  if (msDia === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55, margin: 0 }}>
        No hay registro de este día. No hay nada que analizar y no se va a suponer nada.
      </p>
    );
  }

  if (dia === hoy) {
    return (
      <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55, margin: 0 }}>
        El día todavía no termina. El análisis se escribe solo, la próxima vez que abras la app
        después de medianoche.
      </p>
    );
  }

  if (cierre && !cierre.error) {
    return (
      <>
        <Fila color="var(--pino)" t="Se sostuvo" d={cierre.analisis.sostuvo} />
        <Fila color="var(--diario)" t="Se cayó" d={cierre.analisis.cayo} />
        <Fila color="var(--negocio)" t="El costo" d={cierre.analisis.costo} />
        <Fila color="var(--video)" t="Lo que se repite" d={cierre.analisis.seRepite} last />
      </>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55, margin: "0 0 12px" }}>
        {cierre?.error ??
          (tieneKey
            ? "Este día todavía no tiene análisis."
            : "Falta la API key. El tiempo ya está registrado; el análisis llega cuando la pongas en Ajustes.")}
      </p>
      {tieneKey && (
        <button
          className="btn chip"
          disabled={corriendo}
          onClick={async () => {
            setCorriendo(true);
            try {
              await cerrarDia(dia);
            } catch {
              // El error queda escrito en el cierre y se muestra arriba.
            } finally {
              setCorriendo(false);
            }
          }}
          style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 11px" }}
        >
          {corriendo ? <Loader2 size={12} className="girando" /> : <RotateCcw size={12} />}
          {corriendo ? "Analizando…" : "Analizar este día"}
        </button>
      )}
      {!tieneKey && (
        <div
          style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, color: "var(--ambar)" }}
        >
          <KeyRound size={13} /> Ajustes → API key
        </div>
      )}
    </div>
  );
}

function Fila({
  color,
  t,
  d,
  last,
}: {
  color: string;
  t: string;
  d: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 11,
        paddingBottom: last ? 0 : 13,
        marginBottom: last ? 0 : 13,
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <div style={{ width: 3, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div>
        <div className="eyebrow" style={{ color, fontSize: 9.5 }}>
          {t}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: "4px 0 0" }}>{d}</p>
      </div>
    </div>
  );
}

/* ── periodos ────────────────────────────────────────────────────── */

interface Rango {
  desde: DiaISO;
  hasta: DiaISO;
}

function rangoDe(zoom: Zoom, dia: DiaISO): Rango {
  const d = desdeISO(dia);
  if (zoom === "dia") return { desde: dia, hasta: dia };
  if (zoom === "semana") {
    const lunes = sumarDias(d, -((d.getDay() + 6) % 7));
    return { desde: aISO(lunes), hasta: aISO(sumarDias(lunes, 6)) };
  }
  const primero = new Date(d.getFullYear(), d.getMonth(), 1);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { desde: aISO(primero), hasta: aISO(ultimo) };
}

function enRango(dia: DiaISO, rango: Rango, zoom: Zoom): boolean {
  if (zoom === "dia") return dia === rango.desde;
  return dia >= rango.desde && dia <= rango.hasta;
}

function etiquetaCorta(zoom: Zoom, dia: DiaISO): string {
  if (zoom === "dia") return String(desdeISO(dia).getDate());
  if (zoom === "semana") return String(numeroSemana(dia));
  return mesCorto(dia);
}

function etiquetaLarga(zoom: Zoom, dia: DiaISO): string {
  if (zoom === "dia") return `Análisis del ${fechaCorta(dia)}`;
  if (zoom === "semana") return `Semana ${numeroSemana(dia)} · desde el ${fechaCorta(dia)}`;
  return mesYAno(dia);
}
