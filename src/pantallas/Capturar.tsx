import {
  Briefcase,
  ChevronRight,
  FileText,
  ListTodo,
  Music,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { TipoCaptura } from "../db/db";
import { Header } from "../ui/piezas";

export interface Seccion {
  k: TipoCaptura;
  nom: string;
  Icon: LucideIcon;
  color: string;
  sub: string;
  /** Microcopy del botón de grabar, tal cual el prototipo. */
  label: string;
}

export const SECCIONES: Seccion[] = [
  {
    k: "musica",
    nom: "Música",
    Icon: Music,
    color: "var(--musica)",
    sub: "Letras e ideas sueltas",
    label: "Mantén para grabar",
  },
  {
    k: "video",
    nom: "Video",
    Icon: Video,
    color: "var(--video)",
    sub: "Ideas para grabar",
    label: "Mantén para grabar",
  },
  {
    k: "negocio",
    nom: "Negocio",
    Icon: Briefcase,
    color: "var(--negocio)",
    sub: "Ideas y qué haría falta",
    label: "Mantén para grabar",
  },
  {
    k: "diario",
    nom: "Diario",
    Icon: FileText,
    color: "var(--diario)",
    sub: "Tu día, en tus palabras",
    label: "Cuenta cómo fue tu día",
  },
  {
    k: "pendiente",
    nom: "Pendientes",
    Icon: ListTodo,
    color: "var(--pend)",
    sub: "Con fecha y recordatorio",
    label: "Di lo que tienes que hacer",
  },
];

export function Capturar({
  cuentas,
  seleccion,
  comoLista,
  onAbrir,
  onAjustes,
}: {
  cuentas: Record<TipoCaptura, number>;
  /** En tablet, la sección abierta se marca en vez de navegar fuera. */
  seleccion?: TipoCaptura | null;
  /** Modo lista lateral: se quitan las explicaciones largas, no caben. */
  comoLista?: boolean;
  onAbrir: (s: Seccion) => void;
  onAjustes: () => void;
}) {
  return (
    <div style={{ paddingBottom: 20 }}>
      <Header
        eyebrow="Habla y déjalo ahí"
        title="Capturar"
        right={
          <button
            className="btn card"
            onClick={onAjustes}
            style={{ padding: 9, display: "flex" }}
            aria-label="Ajustes"
          >
            <Settings size={18} />
          </button>
        }
      />

      <div style={{ padding: "6px 20px 0", display: "grid", gap: 8 }}>
        {SECCIONES.map((s) => (
          <button
            key={s.k}
            className="btn card"
            onClick={() => onAbrir(s)}
            aria-current={seleccion === s.k ? "true" : undefined}
            style={{
              padding: 15,
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              borderColor: seleccion === s.k ? "var(--ink)" : "var(--line)",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                display: "grid",
                placeItems: "center",
                background: s.color,
                flexShrink: 0,
              }}
            >
              <s.Icon size={19} color="var(--paper)" strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 500 }}>{s.nom}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 1 }}>{s.sub}</div>
            </div>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink2)" }}>
              {cuentas[s.k]}
            </span>
            {!comoLista && <ChevronRight size={17} color="var(--ink2)" />}
          </button>
        ))}
      </div>
    </div>
  );
}
