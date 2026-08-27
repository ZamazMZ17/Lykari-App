import { CalendarDays, CalendarClock, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import type { Curso, Evaluacion } from "../db/db";
import { bloquesDelDia, type BloqueDelDia } from "../db/cursos";
import { evaluacionesDelDia } from "../db/evaluaciones";
import {
  aISO,
  desdeISO,
  fechaCorta,
  fechaLarga,
  hoyISO,
  indiceSemana,
  lunesDeLaSemana,
  mesYAno,
  NOMBRES_SEMANA,
  NOMBRES_SEMANA_CORTOS,
  sumarDias,
  type DiaISO,
} from "../lib/fecha";
import { Header, Nota } from "../ui/piezas";

type Vista = "dia" | "semana" | "mes";

export interface ProximaEntrega extends Evaluacion {
  cursoNombre: string;
}

export function Horario({
  cursos,
  evaluaciones,
  proxima,
  amplia,
  onNuevo,
  onDetalle,
}: {
  cursos: Curso[];
  evaluaciones: Evaluacion[];
  /** La entrega sin rendir más próxima entre todos los cursos, si hay alguna. */
  proxima?: ProximaEntrega | null;
  amplia?: boolean;
  onNuevo: () => void;
  onDetalle: (curso: Curso) => void;
}) {
  const [vista, setVista] = useState<Vista>("dia");
  const [sel, setSel] = useState<DiaISO>(hoyISO);
  const hoy = hoyISO();

  const irADia = (dia: DiaISO) => {
    setSel(dia);
    setVista("dia");
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <Header
        eyebrow="Tu semana"
        title="Horario"
        right={
          <button
            className="btn card"
            onClick={onNuevo}
            style={{ padding: 9, display: "flex" }}
            aria-label="Agregar curso"
          >
            <Plus size={18} />
          </button>
        }
      />

      {proxima && (
        <button
          className="btn card"
          onClick={() => {
            const curso = cursos.find((c) => c.id === proxima.cursoId);
            if (curso) onDetalle(curso);
          }}
          style={{
            display: "flex",
            gap: 11,
            alignItems: "center",
            textAlign: "left",
            margin: "0 20px 14px",
            padding: "12px 14px",
            width: "calc(100% - 40px)",
          }}
        >
          <CalendarClock size={17} color="var(--pino)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 2 }}>
              Próxima entrega · {fechaCorta(proxima.fecha!)}
            </div>
            <div
              style={{
                fontSize: 13.5,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {proxima.cursoNombre} — {proxima.nombre}
            </div>
          </div>
        </button>
      )}

      <div style={{ display: "flex", gap: 6, padding: "4px 20px 14px" }}>
        {(
          [
            ["dia", "Día"],
            ["semana", "Semana"],
            ["mes", "Mes"],
          ] as [Vista, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            className="btn"
            onClick={() => setVista(k)}
            aria-pressed={vista === k}
            style={{
              flex: 1,
              maxWidth: amplia ? 160 : undefined,
              padding: "8px 0",
              borderRadius: 9,
              fontSize: 12.5,
              border: `1px solid ${vista === k ? "var(--ink)" : "var(--line)"}`,
              background: vista === k ? "var(--ink)" : "transparent",
              color: vista === k ? "var(--paper)" : "var(--ink2)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {cursos.length === 0 ? (
        <Nota icono={<CalendarDays size={16} color="var(--ink2)" style={{ marginTop: 2 }} />}>
          Todavía no agregaste ningún curso. Con «+» pones el nombre, el rango del ciclo y a qué
          horas se dicta cada semana.
        </Nota>
      ) : vista === "dia" ? (
        <VistaDia
          sel={sel}
          hoy={hoy}
          cursos={cursos}
          evaluaciones={evaluaciones}
          onCambiar={setSel}
          onDetalle={onDetalle}
        />
      ) : vista === "semana" ? (
        <VistaSemana
          sel={sel}
          hoy={hoy}
          cursos={cursos}
          amplia={amplia}
          onCambiar={setSel}
          onIrADia={irADia}
          onDetalle={onDetalle}
        />
      ) : (
        <VistaMes
          sel={sel}
          hoy={hoy}
          cursos={cursos}
          evaluaciones={evaluaciones}
          onCambiar={setSel}
          onIrADia={irADia}
        />
      )}
    </div>
  );
}

/* ── nav genérica de periodo ─────────────────────────────────────── */

function NavPeriodo({
  etiqueta,
  onPrev,
  onNext,
  onHoy,
  mostrarHoy,
}: {
  etiqueta: string;
  onPrev: () => void;
  onNext: () => void;
  onHoy: () => void;
  mostrarHoy: boolean;
}) {
  return (
    <div style={{ padding: "0 20px 14px", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn card"
          onClick={onPrev}
          aria-label="Periodo anterior"
          style={{ padding: 8, display: "flex" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 13.5, fontWeight: 500 }}>
          {etiqueta}
        </div>
        <button
          className="btn card"
          onClick={onNext}
          aria-label="Periodo siguiente"
          style={{ padding: 8, display: "flex" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {mostrarHoy && (
        <button className="btn chip" onClick={onHoy} style={{ justifySelf: "center" }}>
          Ir a hoy
        </button>
      )}
    </div>
  );
}

/* ── día ─────────────────────────────────────────────────────────── */

function VistaDia({
  sel,
  hoy,
  cursos,
  evaluaciones,
  onCambiar,
  onDetalle,
}: {
  sel: DiaISO;
  hoy: DiaISO;
  cursos: Curso[];
  evaluaciones: Evaluacion[];
  onCambiar: (d: DiaISO) => void;
  onDetalle: (c: Curso) => void;
}) {
  const bloques = bloquesDelDia(cursos, sel);
  const entregas = evaluacionesDelDia(evaluaciones, sel);
  return (
    <div>
      <NavPeriodo
        etiqueta={fechaLarga(desdeISO(sel))}
        onPrev={() => onCambiar(aISO(sumarDias(desdeISO(sel), -1)))}
        onNext={() => onCambiar(aISO(sumarDias(desdeISO(sel), 1)))}
        onHoy={() => onCambiar(hoy)}
        mostrarHoy={sel !== hoy}
      />
      {bloques.length === 0 && entregas.length === 0 ? (
        <Nota>No tienes clases ni entregas este día.</Nota>
      ) : (
        <div style={{ padding: "0 20px", display: "grid", gap: 8 }}>
          {entregas.map((ev) => {
            const curso = cursos.find((c) => c.id === ev.cursoId);
            if (!curso) return null;
            return <FilaEntrega key={`ev-${ev.id}`} ev={ev} curso={curso} onDetalle={onDetalle} />;
          })}
          {bloques.map((b, i) => (
            <FilaBloque key={i} b={b} onDetalle={onDetalle} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaEntrega({
  ev,
  curso,
  onDetalle,
}: {
  ev: Evaluacion;
  curso: Curso;
  onDetalle: (c: Curso) => void;
}) {
  return (
    <button
      className="btn card"
      onClick={() => onDetalle(curso)}
      style={{
        padding: "13px 14px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        textAlign: "left",
        borderStyle: "dashed",
      }}
    >
      <CalendarClock size={17} color="var(--pino)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ev.nombre}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 3 }}>
          {curso.nombre} · {ev.peso}%{ev.hecha ? " · ya rendida" : ""}
        </div>
      </div>
    </button>
  );
}

function FilaBloque({ b, onDetalle }: { b: BloqueDelDia; onDetalle: (c: Curso) => void }) {
  return (
    <button
      className="btn card"
      onClick={() => onDetalle(b.curso)}
      style={{
        padding: "13px 14px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        textAlign: "left",
      }}
    >
      <div className="mono" style={{ fontSize: 12.5, color: "var(--pino)", width: 84, flexShrink: 0 }}>
        {b.bloque.horaInicio}
        <br />
        {b.bloque.horaFin}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {b.curso.nombre}
        </div>
        {b.bloque.salon && (
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              marginTop: 3,
              fontSize: 12,
              color: "var(--ink2)",
            }}
          >
            <MapPin size={11} /> {b.bloque.salon}
          </div>
        )}
      </div>
    </button>
  );
}

/* ── semana ──────────────────────────────────────────────────────── */

function VistaSemana({
  sel,
  hoy,
  cursos,
  amplia,
  onCambiar,
  onIrADia,
  onDetalle,
}: {
  sel: DiaISO;
  hoy: DiaISO;
  cursos: Curso[];
  amplia?: boolean;
  onCambiar: (d: DiaISO) => void;
  onIrADia: (d: DiaISO) => void;
  onDetalle: (c: Curso) => void;
}) {
  const lunes = lunesDeLaSemana(sel);
  const dias = Array.from({ length: 7 }, (_, i) => aISO(sumarDias(desdeISO(lunes), i)));

  return (
    <div>
      <NavPeriodo
        etiqueta={`Semana del ${fechaLarga(desdeISO(lunes)).replace(/^\S+ /, "")}`}
        onPrev={() => onCambiar(aISO(sumarDias(desdeISO(sel), -7)))}
        onNext={() => onCambiar(aISO(sumarDias(desdeISO(sel), 7)))}
        onHoy={() => onCambiar(hoy)}
        mostrarHoy={lunesDeLaSemana(hoy) !== lunes}
      />
      <div
        style={{
          padding: "0 20px",
          display: "grid",
          gap: 8,
          gridTemplateColumns: amplia ? "repeat(auto-fill, minmax(260px, 1fr))" : undefined,
        }}
      >
        {dias.map((dia, i) => {
          const bloques = bloquesDelDia(cursos, dia);
          const esHoy = dia === hoy;
          return (
            <div
              key={dia}
              className="card"
              style={{ padding: "11px 13px", borderColor: esHoy ? "var(--pino)" : "var(--line)" }}
            >
              <button
                className="btn"
                onClick={() => onIrADia(dia)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  marginBottom: bloques.length > 0 ? 9 : 0,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: esHoy ? 700 : 500 }}>
                  {NOMBRES_SEMANA[i]}
                </span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink2)" }}>
                  {desdeISO(dia).getDate()}
                </span>
              </button>
              {bloques.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {bloques.map((b, j) => (
                    <button
                      key={j}
                      className="btn"
                      onClick={() => onDetalle(b.curso)}
                      style={{ display: "flex", gap: 8, alignItems: "baseline", textAlign: "left" }}
                    >
                      <span className="mono" style={{ fontSize: 11, color: "var(--pino)", flexShrink: 0 }}>
                        {b.bloque.horaInicio}
                      </span>
                      <span
                        style={{
                          fontSize: 12.5,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.curso.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── mes ─────────────────────────────────────────────────────────── */

function VistaMes({
  sel,
  hoy,
  cursos,
  evaluaciones,
  onCambiar,
  onIrADia,
}: {
  sel: DiaISO;
  hoy: DiaISO;
  cursos: Curso[];
  evaluaciones: Evaluacion[];
  onCambiar: (d: DiaISO) => void;
  onIrADia: (d: DiaISO) => void;
}) {
  const base = desdeISO(sel);
  const primero = new Date(base.getFullYear(), base.getMonth(), 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const celdas: (DiaISO | null)[] = Array(indiceSemana(primero)).fill(null);
  for (let d = 1; d <= ultimo.getDate(); d++) {
    celdas.push(aISO(new Date(base.getFullYear(), base.getMonth(), d)));
  }
  while (celdas.length % 7 !== 0) celdas.push(null);

  const cambiarMes = (delta: number) => {
    const d = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    onCambiar(aISO(d));
  };
  const mesActual = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
  const mesDeHoy = hoy.slice(0, 7);

  return (
    <div>
      <NavPeriodo
        etiqueta={mesYAno(sel)}
        onPrev={() => cambiarMes(-1)}
        onNext={() => cambiarMes(1)}
        onHoy={() => onCambiar(hoy)}
        mostrarHoy={mesActual !== mesDeHoy}
      />
      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 6,
          }}
        >
          {NOMBRES_SEMANA_CORTOS.map((n) => (
            <div
              key={n}
              className="eyebrow"
              style={{ textAlign: "center", fontSize: 9.5 }}
            >
              {n}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {celdas.map((dia, i) => {
            if (!dia) return <div key={i} />;
            const tieneAlgo =
              bloquesDelDia(cursos, dia).length > 0 || evaluacionesDelDia(evaluaciones, dia).length > 0;
            const esHoy = dia === hoy;
            return (
              <button
                key={dia}
                className="btn"
                onClick={() => onIrADia(dia)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  gap: 2,
                  border: `1px solid ${esHoy ? "var(--pino)" : "var(--line)"}`,
                  background: esHoy ? "rgba(31,77,63,.08)" : "transparent",
                }}
              >
                <span className="mono" style={{ fontSize: 12, fontWeight: esHoy ? 700 : 400 }}>
                  {desdeISO(dia).getDate()}
                </span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: tieneAlgo ? "var(--pino)" : "transparent",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
