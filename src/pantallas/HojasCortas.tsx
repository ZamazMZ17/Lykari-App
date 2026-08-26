import { AlertTriangle, MapPin, Pencil, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Actividad, Curso } from "../db/db";
import type { NuevaActividad as DatosActividad } from "../db/acciones";
import type { NuevoCurso as DatosCurso } from "../db/cursos";
import { desdeISO, NOMBRES_SEMANA } from "../lib/fecha";
import { duracionLarga } from "../lib/tiempo";
import { FormularioActividad } from "./NuevaActividad";
import { FormularioCurso } from "./NuevoCurso";
import { BotonPrincipal, Hoja } from "../ui/piezas";

const ETIQUETA_ALCANCE = {
  hoy: "solo hoy",
  semana: "toda la semana",
  mes: "todo el mes",
} as const;

const fechaCorta = (iso: string) =>
  desdeISO(iso).toLocaleDateString("es", { day: "numeric", month: "long" });

/**
 * Ver y editar viven en la misma hoja, alternando por estado interno en vez
 * de abrir una segunda hoja encima: `useAtras` cuenta una entrada de
 * historial por hoja montada, y dos hojas seguidas sin cerrar la primera
 * descuadran esa cuenta (ver nota en `FormularioActividad`).
 */
export function DetalleActividad({
  act,
  msHoy,
  onGuardar,
  onRetirar,
  onClose,
}: {
  act: Actividad;
  msHoy: number;
  onGuardar: (datos: DatosActividad) => void;
  onRetirar: () => void;
  onClose: () => void;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Hoja onClose={onClose} eyebrow="Tablón" titulo="Editar actividad">
        <FormularioActividad inicial={act} onGuardar={onGuardar} />
      </Hoja>
    );
  }

  return (
    <Hoja onClose={onClose} eyebrow="Actividad" titulo={act.nombre}>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        <Dato
          k="En el tablón"
          v={`${ETIQUETA_ALCANCE[act.alcance]} · del ${fechaCorta(act.desde)} al ${fechaCorta(act.hasta)}`}
        />
        <Dato k="Hoy" v={msHoy > 0 ? duracionLarga(msHoy) : "sin registro todavía"} />
        <Dato
          k="Referencia"
          v={act.referenciaMin > 0 ? `${act.referenciaMin} min (solo una marca)` : "sin marca"}
        />
        <Dato
          k="Si te olvidas"
          v={
            act.tipo === "enfoque"
              ? "se cierra sola a las 3 h"
              : "no se cierra sola, sigue contando"
          }
          icono={act.tipo === "enfoque" ? <Timer size={13} /> : <AlertTriangle size={13} />}
        />
      </div>

      <BotonPrincipal onClick={() => setEditando(true)}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <Pencil size={15} /> Editar
        </span>
      </BotonPrincipal>
      <button
        className="btn"
        onClick={onRetirar}
        style={{
          width: "100%",
          padding: "13px 0",
          marginTop: 8,
          borderRadius: 14,
          border: "1px solid var(--line)",
          color: "var(--ink2)",
          display: "flex",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          fontSize: 14,
        }}
      >
        <Trash2 size={15} /> Quitar del tablón
      </button>
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "10px 0 0", lineHeight: 1.5 }}>
        Quitarla no borra nada: el tiempo que ya registraste sigue contando en el camino.
      </p>
    </Hoja>
  );
}

export function DetalleCurso({
  curso,
  onGuardar,
  onEliminar,
  onClose,
}: {
  curso: Curso;
  onGuardar: (datos: DatosCurso) => void;
  onEliminar: () => void;
  onClose: () => void;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Hoja onClose={onClose} eyebrow="Horario" titulo="Editar curso">
        <FormularioCurso inicial={curso} onGuardar={onGuardar} />
      </Hoja>
    );
  }

  return (
    <Hoja onClose={onClose} eyebrow="Curso" titulo={curso.nombre}>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {curso.codigo && <Dato k="Código" v={curso.codigo} />}
        <Dato k="Ciclo" v={`Del ${fechaCorta(curso.desde)} al ${fechaCorta(curso.hasta)}`} />
        <div>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>
            Horarios
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {curso.bloques.map((b, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: "9px 12px", display: "flex", gap: 8, alignItems: "center" }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, width: 42, flexShrink: 0 }}>
                  {NOMBRES_SEMANA[b.dia].slice(0, 3)}
                </span>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--ink2)" }}>
                  {b.horaInicio}–{b.horaFin}
                </span>
                {b.salon && (
                  <span
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      fontSize: 12,
                      color: "var(--ink2)",
                    }}
                  >
                    <MapPin size={11} /> {b.salon}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BotonPrincipal onClick={() => setEditando(true)}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <Pencil size={15} /> Editar
        </span>
      </BotonPrincipal>
      <button
        className="btn"
        onClick={onEliminar}
        style={{
          width: "100%",
          padding: "13px 0",
          marginTop: 8,
          borderRadius: 14,
          border: "1px solid var(--line)",
          color: "var(--ink2)",
          display: "flex",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          fontSize: 14,
        }}
      >
        <Trash2 size={15} /> Eliminar curso
      </button>
    </Hoja>
  );
}

function Dato({ k, v, icono }: { k: string; v: string; icono?: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ fontSize: 9.5 }}>
        {k}
      </div>
      <div
        style={{ fontSize: 13.5, marginTop: 3, display: "flex", gap: 6, alignItems: "center" }}
      >
        {icono}
        {v}
      </div>
    </div>
  );
}

/** Solo puede haber una sesión corriendo: si no, el tiempo registrado se dobla. */
export function SesionEnCurso({
  enCurso,
  nueva,
  onIr,
  onCerrarYEmpezar,
  onClose,
}: {
  enCurso: string;
  nueva: string;
  onIr: () => void;
  onCerrarYEmpezar: () => void;
  onClose: () => void;
}) {
  return (
    <Hoja onClose={onClose} eyebrow="Ya hay algo corriendo" titulo={enCurso}>
      <p style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, margin: "0 0 18px" }}>
        Solo puede correr una sesión a la vez, si no el tiempo se contaría dos veces. Elige qué
        hacer con «{nueva}».
      </p>
      <BotonPrincipal onClick={onIr}>Ir a la sesión que está corriendo</BotonPrincipal>
      <button
        className="btn"
        onClick={onCerrarYEmpezar}
        style={{
          width: "100%",
          padding: "13px 0",
          marginTop: 8,
          borderRadius: 14,
          border: "1px solid var(--line)",
          fontSize: 14,
          color: "var(--ink2)",
        }}
      >
        Cerrarla y empezar «{nueva}»
      </button>
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "10px 0 0", lineHeight: 1.5 }}>
        Si la cierras así, queda guardada con el audio pendiente.
      </p>
    </Hoja>
  );
}
