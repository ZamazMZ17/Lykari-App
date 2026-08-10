import { AlertTriangle, Timer, Trash2 } from "lucide-react";
import type { Actividad } from "../db/db";
import { desdeISO } from "../lib/fecha";
import { duracionLarga } from "../lib/tiempo";
import { BotonPrincipal, Hoja } from "../ui/piezas";

const ETIQUETA_ALCANCE = {
  hoy: "solo hoy",
  semana: "toda la semana",
  mes: "todo el mes",
} as const;

const fechaCorta = (iso: string) =>
  desdeISO(iso).toLocaleDateString("es", { day: "numeric", month: "long" });

export function DetalleActividad({
  act,
  msHoy,
  onRetirar,
  onClose,
}: {
  act: Actividad;
  msHoy: number;
  onRetirar: () => void;
  onClose: () => void;
}) {
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

      <button
        className="btn"
        onClick={onRetirar}
        style={{
          width: "100%",
          padding: "13px 0",
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
