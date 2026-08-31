import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Play, Square, Timer, X } from "lucide-react";
import type { Actividad, EjercicioDeRutina, Plan } from "../db/db";
import {
  bajarDeNivel,
  guardarAvanceHoy,
  nivelActualDe,
  nivelesDe,
  registrosDePlan,
} from "../db/planes";
import { hoyISO } from "../lib/fecha";
import { icono } from "../lib/iconos";
import { Barra, BotonPrincipal, Hoja } from "../ui/piezas";

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
  const registroHoy = registros.find((r) => r.dia === hoyISO());
  const diaIndice =
    nivel.dias.length <= 1
      ? 0
      : (registroHoy?.diaRutinaIndice ?? completosEnNivel % nivel.dias.length);
  const diaRutina = nivel.dias[diaIndice];
  const totalDiasCompletos = registros.filter((r) => r.completo).length;

  const [hechos, setHechos] = useState<string[]>(
    () => registroHoy?.ejerciciosHechos ?? [],
  );
  const [guardando, setGuardando] = useState(false);
  const [verNiveles, setVerNiveles] = useState(false);
  const [descanso, setDescanso] = useState<{ nombre: string; restante: number } | null>(null);
  const intervaloDescanso = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (intervaloDescanso.current) clearInterval(intervaloDescanso.current);
    },
    [],
  );

  const alternar = (nombre: string) => {
    setHechos((h) => (h.includes(nombre) ? h.filter((n) => n !== nombre) : [...h, nombre]));
  };

  const iniciarDescanso = (e: EjercicioDeRutina) => {
    if (!e.descansoSeg) return;
    if (intervaloDescanso.current) clearInterval(intervaloDescanso.current);
    setDescanso({ nombre: e.nombre, restante: e.descansoSeg });
    intervaloDescanso.current = setInterval(() => {
      setDescanso((d) => {
        if (!d) return d;
        if (d.restante <= 1) {
          if (intervaloDescanso.current) clearInterval(intervaloDescanso.current);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(250);
          return null;
        }
        return { ...d, restante: d.restante - 1 };
      });
    }, 1000);
  };

  const cancelarDescanso = () => {
    if (intervaloDescanso.current) clearInterval(intervaloDescanso.current);
    setDescanso(null);
  };

  const todoHecho = diaRutina.ejercicios.every((e) => hechos.includes(e.nombre));

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarAvanceHoy(plan.id!, diaIndice, hechos, todoHecho);
    } finally {
      setGuardando(false);
    }
  };

  const Ico = icono(act.icono);

  return (
    <Hoja onClose={onClose} eyebrow={NOMBRE_CATEGORIA[plan.categoria]} titulo={nivel.nombre}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Ico size={17} color="var(--pino)" strokeWidth={1.7} />
        <div style={{ flex: 1, fontSize: 13, color: "var(--ink2)" }}>
          {siguienteNivel
            ? `${completosEnNivel}/${nivel.sesionesParaSubir} días para subir de nivel`
            : "Nivel máximo"}
        </div>
      </div>
      <Barra v={completosEnNivel} meta={nivel.sesionesParaSubir} />

      <div className="eyebrow" style={{ margin: "20px 0 8px" }}>
        Rutina de hoy · {diaRutina.titulo}
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        {diaRutina.ejercicios.map((e) => {
          const hecho = hechos.includes(e.nombre);
          const descansando = descanso?.nombre === e.nombre;
          return (
            <div
              key={e.nombre}
              className="card"
              style={{
                padding: "11px 13px",
                display: "flex",
                gap: 11,
                alignItems: "center",
                borderColor: hecho ? "var(--pino)" : "var(--line)",
                background: hecho ? "var(--tinte-pino)" : "var(--paper)",
              }}
            >
              <button
                className="btn"
                onClick={() => alternar(e.nombre)}
                aria-pressed={hecho}
                style={{ display: "flex", gap: 11, alignItems: "center", flex: 1, minWidth: 0, textAlign: "left" }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 7,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    border: `1.5px solid ${hecho ? "var(--pino)" : "var(--line)"}`,
                    background: hecho ? "var(--pino)" : "transparent",
                  }}
                >
                  {hecho && <Check size={13} color="var(--paper)" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>{e.nombre}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink2)", marginTop: 2 }}>
                    {e.detalle}
                  </div>
                </div>
              </button>
              {e.descansoSeg &&
                (descansando ? (
                  <button
                    className="btn chip"
                    onClick={cancelarDescanso}
                    aria-label="Cancelar descanso"
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      gap: 5,
                      alignItems: "center",
                      padding: "6px 9px",
                      background: "var(--ambar)",
                      color: "var(--paper)",
                      border: "none",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                      {String(Math.floor(descanso!.restante / 60)).padStart(2, "0")}:
                      {String(descanso!.restante % 60).padStart(2, "0")}
                    </span>
                    <X size={12} />
                  </button>
                ) : (
                  <button
                    className="btn chip"
                    onClick={() => iniciarDescanso(e)}
                    aria-label={`Descansar ${e.descansoSeg} segundos`}
                    style={{ flexShrink: 0, display: "flex", gap: 5, alignItems: "center", padding: "6px 9px" }}
                  >
                    <Timer size={12} />
                    <span className="mono" style={{ fontSize: 11.5 }}>{e.descansoSeg}s</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      {registroHoy?.completo === 1 && (
        <p style={{ fontSize: 12, color: "var(--pino)", margin: "0 0 12px" }}>
          Completado hoy.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 20 }}>
        <BotonPrincipal disabled={guardando || hechos.length === 0} onClick={guardar}>
          {todoHecho ? "Guardar rutina completa" : "Guardar avance de hoy"}
        </BotonPrincipal>
      </div>

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
        {totalDiasCompletos} {totalDiasCompletos === 1 ? "día completo" : "días completos"} en
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
