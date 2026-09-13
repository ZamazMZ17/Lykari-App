import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ChevronDown, Play, Square } from "lucide-react";
import type { Actividad, Plan } from "../db/db";
import {
  bajarDeNivel,
  nivelActualDe,
  nivelesDe,
  registrosDePlan,
} from "../db/planes";
import { icono } from "../lib/iconos";
import { Barra, Hoja } from "../ui/piezas";

import { RutinaDelDia } from "./plan/RutinaDelDia";

const NOMBRE_CATEGORIA = { ejercicio: "Ejercicio", gymface: "GymFace" } as const;

export function DetallePlan({
  act,
  plan,
  enSesion,
  onIniciar,
  onClose,
}: {
  act: Actividad;
  plan: Plan;
  enSesion: boolean;
  onIniciar: () => void;
  onClose: () => void;
}) {
  const registros = useLiveQuery(() => registrosDePlan(plan.id!), [plan.id], []);
  const nivel = nivelActualDe(plan);
  const niveles = nivelesDe(plan.categoria);
  const siguienteNivel = niveles.find((n) => n.numero === plan.nivelActual + 1);

  const completosEnNivel = registros.filter(
    (r) => r.nivelNumero === plan.nivelActual && r.completo,
  ).length;
  const totalDiasCompletos = registros.filter((r) => r.completo).length;
  const [verNiveles, setVerNiveles] = useState(false);

  const Ico = icono(act.icono);

  return (
    <Hoja onClose={onClose} eyebrow={NOMBRE_CATEGORIA[plan.categoria]} titulo={nivel.nombre}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Ico size={17} color="var(--pino)" strokeWidth={1.7} />
        <div style={{ flex: 1, fontSize: 13, color: "var(--ink2)" }}>
          {siguienteNivel
            ? `${completosEnNivel}/${nivel.sesionesParaSubir} rutinas registradas para cambiar de nivel`
            : "Nivel de mantenimiento"}
        </div>
      </div>
      <Barra v={completosEnNivel} meta={nivel.sesionesParaSubir} />

      <RutinaDelDia plan={plan} actividad={act} />

      <button
        className="btn"
        onClick={onIniciar}
        disabled={enSesion}
        style={{
          width: "100%",
          padding: "13px 0",
          marginBottom: 20,
          borderRadius: 14,
          border: "1px solid var(--line)",
          fontSize: 14,
          display: "flex",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          color: enSesion ? "var(--ink2)" : "var(--ink)",
        }}
      >
        <Play size={15} /> Cronometrar esta sesión
      </button>

      <button
        className="btn"
        onClick={() => setVerNiveles((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          color: "var(--ink2)",
          marginBottom: verNiveles ? 10 : 0,
        }}
      >
        <ChevronDown size={14} style={{ transform: verNiveles ? "rotate(180deg)" : undefined }} />
          {totalDiasCompletos} {totalDiasCompletos === 1 ? "rutina registrada" : "rutinas registradas"} en
        total · ver niveles
      </button>

      {verNiveles && (
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {niveles.map((n) => (
            <div
              key={n.numero}
              className="card"
              style={{
                padding: "9px 12px",
                display: "flex",
                justifyContent: "space-between",
                borderColor: n.numero === plan.nivelActual ? "var(--pino)" : "var(--line)",
              }}
            >
              <span style={{ fontSize: 13 }}>{n.nombre}</span>
              {n.numero === plan.nivelActual && (
                <span className="chip" style={{ fontSize: 10.5 }}>
                  actual
                </span>
              )}
            </div>
          ))}
          {plan.nivelActual > 1 && (
            <button
              className="btn"
              onClick={() => void bajarDeNivel(plan.id!)}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "var(--ink2)",
                padding: "8px 0",
              }}
            >
              <Square size={12} /> Bajar un nivel
            </button>
          )}
        </div>
      )}
    </Hoja>
  );
}
