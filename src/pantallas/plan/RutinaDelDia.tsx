import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Check, Timer, X } from "lucide-react";
import type { Actividad, Plan } from "../../db/db";
import { guardarAvanceHoy, registrosDePlan } from "../../db/planes";
import { cronometro } from "../../lib/tiempo";
import { rutinaDeHoy } from "./rutina";
import { cancelarDescanso, iniciarDescanso, leerDescanso, observarDescanso, segundosRestantes } from "./descanso";

export function RutinaDelDia({ plan, actividad, sesionId }: {
  plan: Plan;
  actividad: Actividad;
  sesionId?: number;
}) {
  const registros = useLiveQuery(() => plan.id == null ? [] : registrosDePlan(plan.id), [plan.id]);
  const descanso = useLiveQuery(leerDescanso, []);
  const [ahora, setAhora] = useState(Date.now);
  const [guardando, setGuardando] = useState(false);
  const ocupado = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    observarDescanso();
    const intervalo = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(intervalo);
  }, []);

  if (!registros) return <p role="status">Cargando rutina…</p>;
  const { registro, diaRutina } = rutinaDeHoy(plan, registros);
  const hechos = registro?.ejerciciosHechos ?? [];
  const restante = segundosRestantes(descanso, ahora);

  const alternar = async (nombre: string) => {
    if (ocupado.current || plan.id == null) return;
    ocupado.current = true;
    setGuardando(true);
    setError(null);
    try {
      // Releer en cada acción evita usar un render anterior de useLiveQuery.
      const actual = rutinaDeHoy(plan, await registrosDePlan(plan.id));
      const previos = actual.registro?.ejerciciosHechos ?? [];
      const siguientes = previos.includes(nombre) ? previos.filter((n) => n !== nombre) : [...previos, nombre];
      await guardarAvanceHoy(plan.id, actual.diaIndice, siguientes,
        actual.diaRutina.ejercicios.every((e) => siguientes.includes(e.nombre)), sesionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      ocupado.current = false;
      setGuardando(false);
    }
  };

  const cambiarDescanso = async (nombre?: string, segundos?: number) => {
    setError(null);
    try {
      if (nombre && segundos) await iniciarDescanso(nombre, segundos);
      else await cancelarDescanso();
      setAhora(Date.now());
    } catch {
      setError("No se pudo guardar el descanso. Inténtalo de nuevo.");
    }
  };

  return (
    <section aria-label={`Rutina de ${actividad.nombre}`}>
      <div className="eyebrow" style={{ margin: "20px 0 8px" }}>
        Rutina de hoy · {diaRutina.titulo}
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        {diaRutina.ejercicios.map((e) => {
          const hecho = hechos.includes(e.nombre);
          const descansando = descanso?.nombre === e.nombre && restante > 0;
          return (
            <div key={e.nombre} className="card" style={{ padding: "11px 13px", display: "flex", gap: 11,
              alignItems: "center", borderColor: hecho ? "var(--pino)" : "var(--line)", background: "var(--paper)" }}>
              <button className="btn" onClick={() => void alternar(e.nombre)} aria-pressed={hecho}
                disabled={guardando || plan.id == null}
                style={{ display: "flex", gap: 11, alignItems: "center", flex: 1, minWidth: 0, textAlign: "left" }}>
                <span style={{ width: 20, height: 20, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center",
                  border: `1.5px solid ${hecho ? "var(--pino)" : "var(--line)"}`, background: hecho ? "var(--pino)" : "transparent" }}>
                  {hecho && <Check size={13} color="var(--paper)" strokeWidth={3} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14 }}>{e.nombre}</span>
                  <span className="mono" style={{ display: "block", fontSize: 11.5, color: "var(--ink2)", marginTop: 2 }}>{e.detalle}</span>
                </span>
              </button>
              {!!e.descansoSeg && (
                <button className="btn chip" onClick={() => void cambiarDescanso(descansando ? undefined : e.nombre, e.descansoSeg)}
                  aria-label={descansando ? `Cancelar descanso de ${e.nombre}` : `Descansar ${e.descansoSeg} segundos · ${e.nombre}`}
                  style={{ flexShrink: 0, display: "flex", gap: 5, alignItems: "center", padding: "6px 9px",
                    ...(descansando ? { background: "var(--ambar)", color: "var(--paper)", borderColor: "var(--ambar)" } : {}) }}>
                  {descansando ? <><span className="mono" style={{ fontSize: 12 }}>{cronometro(restante * 1000)}</span><X size={12} /></>
                    : <><Timer size={12} /><span className="mono" style={{ fontSize: 11.5 }}>{e.descansoSeg}s</span></>}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {descanso && restante > 0 && !diaRutina.ejercicios.some((e) => e.nombre === descanso.nombre) && (
        <button className="btn chip" onClick={() => void cambiarDescanso()} style={{ color: "var(--ambar)", display: "flex", gap: 6 }}>
          <Timer size={14} /> Descanso · {descanso.nombre} · {cronometro(restante * 1000)} <X size={12} />
        </button>
      )}
      <p role="status" style={{ fontSize: 12, color: "var(--ink2)", margin: "8px 0 18px" }}>
        {guardando ? "Guardando…" : registro ? `${hechos.length} de ${diaRutina.ejercicios.length} ejercicios registrados hoy.` : "Cada marca se guarda al tocar."}
      </p>
      {error && <p role="alert" style={{ fontSize: 12, color: "var(--ink)", marginBottom: 18 }}>{error}</p>}
    </section>
  );
}
