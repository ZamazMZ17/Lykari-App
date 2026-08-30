import { useLiveQuery } from "dexie-react-hooks";
import {
  Briefcase,
  Check,
  Dumbbell,
  EyeOff,
  Flag,
  Glasses,
  Music,
  PenLine,
  Video,
  type LucideIcon,
} from "lucide-react";

import { estaPuesta, estadoDeLaRacha, piezasDeLaSemana, type PiezaKey } from "../db/mascota";
import { CLAVE_MASCOTA_OCULTA, guardarAjuste } from "../ia/ajustes";
import { fechaCorta, hoyISO } from "../lib/fecha";
import { Husky } from "../ui/Husky";
import { Hoja } from "../ui/piezas";

const ICONO: Record<PiezaKey, LucideIcon> = {
  lentes: Glasses,
  pesa: Dumbbell,
  bandera: Flag,
  audifonos: Music,
  camara: Video,
  maletin: Briefcase,
  lapiz: PenLine,
};

/**
 * Un toque en la burbuja abre esto, no navega fuera de la pantalla en la que
 * estabas (CLAUDE.md §6). Lo que nunca hace: poner cara triste, felicitar por
 * días vacíos, ni pedir nada.
 */
export function HojaMascota({ onCamino, onClose }: { onCamino: () => void; onClose: () => void }) {
  const racha = useLiveQuery(() => estadoDeLaRacha(), []);
  const piezas = useLiveQuery(() => piezasDeLaSemana(), [], []);

  const puestas = piezas.filter(estaPuesta);
  const dias = racha?.dias ?? 0;
  const nudos = racha?.nudos ?? 0;

  return (
    <Hoja onClose={onClose} eyebrow="Tu racha" titulo={textoRacha(dias)}>
      <div style={{ display: "grid", placeItems: "center", marginBottom: 6 }}>
        <Husky size={186} racha={dias} nudos={nudos} piezas={puestas.map((p) => p.k)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          ["días seguidos", dias],
          ["nudos ganados", nudos],
          ["piezas esta semana", puestas.length],
        ].map(([l, v]) => (
          <div key={String(l)} className="card" style={{ flex: 1, padding: "9px 10px" }}>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
              {v}
            </div>
            <div className="eyebrow" style={{ fontSize: 9 }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 18px" }}>
        {racha?.diaLibreUsado
          ? `Día libre usado el ${fechaCorta(racha.diaLibreUsado)}.`
          : "Día libre de esta semana sin usar."}
      </p>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Piezas de esta semana
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
        {piezas.map((p) => {
          const I = ICONO[p.k];
          const puesta = estaPuesta(p);
          return (
            <div
              key={p.k}
              className="card"
              style={{
                padding: "10px 12px",
                display: "flex",
                gap: 11,
                alignItems: "center",
                opacity: puesta ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: puesta ? p.color : "transparent",
                  border: puesta ? "none" : "1px solid var(--line)",
                  color: puesta ? "var(--paper)" : "var(--ink2)",
                }}
              >
                <I size={15} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.nombre}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink2)" }}>
                  {p.area} · {p.regla}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--ink2)" }}>
                {puesta ? <Check size={14} color={p.color} /> : `${p.hecho}/${p.falta}`}
              </span>
            </div>
          );
        })}
      </div>

      <button
        className="btn card"
        onClick={onCamino}
        style={{ width: "100%", padding: "13px 0", fontSize: 14, fontWeight: 500 }}
      >
        Ver el análisis en Camino
      </button>

      <button
        className="btn"
        onClick={async () => {
          await guardarAjuste(CLAVE_MASCOTA_OCULTA, hoyISO());
          onClose();
        }}
        style={{
          width: "100%",
          padding: "12px 0 2px",
          fontSize: 12.5,
          color: "var(--ink2)",
          display: "flex",
          gap: 7,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <EyeOff size={14} /> Esconderla hasta mañana
      </button>
    </Hoja>
  );
}

/** Sin exclamaciones ni ánimo. Es un dato. */
function textoRacha(dias: number): string {
  if (dias === 0) return "Sin racha viva";
  if (dias === 1) return "Un día con registro";
  return `${dias} días con registro`;
}
