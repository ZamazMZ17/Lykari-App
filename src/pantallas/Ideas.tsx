import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Captura } from "../db/db";
import { cambiarEstado } from "../db/capturas";
import { procesarCaptura } from "../ia/procesar";
import { BotonGrabar } from "../ui/BotonGrabar";
import { Reproductor } from "../ui/Audio";
import { Header, Nota } from "../ui/piezas";
import type { Seccion } from "./Capturar";

export function Ideas({
  seccion,
  items,
  tieneKey,
  onBack,
}: {
  seccion: Seccion;
  items: Captura[];
  tieneKey: boolean;
  /** Sin volver en tablet: la lista de secciones ya está al lado. */
  onBack?: () => void;
}) {
  // `undefined` = el usuario todavía no tocó nada, así que abrimos la primera.
  // No se puede inicializar con items[0] porque en el primer render la lista
  // aún está vacía: la consulta a la base llega después.
  const [tocada, setTocada] = useState<number | null | undefined>(undefined);
  const abierta = tocada === undefined ? items[0]?.id : tocada;

  return (
    <div style={{ paddingBottom: 132 }}>
      <Header eyebrow="Capturar" title={seccion.nom} onBack={onBack} />

      {items.length === 0 ? (
        <Nota>Todavía no hay nada aquí.</Nota>
      ) : (
        <div style={{ padding: "6px 20px 0", display: "grid", gap: 8 }}>
          {items.map((c) => (
            <Item
              key={c.id}
              captura={c}
              color={seccion.color}
              tieneKey={tieneKey}
              abierta={abierta === c.id}
              onAlternar={() => setTocada(abierta === c.id ? null : c.id!)}
            />
          ))}
        </div>
      )}

      <BotonGrabar tipo={seccion.k} color={seccion.color} label={seccion.label} />
    </div>
  );
}

function Item({
  captura,
  color,
  tieneKey,
  abierta,
  onAlternar,
}: {
  captura: Captura;
  color: string;
  tieneKey: boolean;
  abierta: boolean;
  onAlternar: () => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const sinProcesar = captura.estado === "nueva";
  const hecha = captura.estado === "hecha";

  const reintentar = async () => {
    setProcesando(true);
    try {
      await procesarCaptura(captura.id!);
    } catch {
      // El error queda escrito en la captura; se muestra abajo.
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="card" style={{ overflow: "hidden", opacity: hecha ? 0.55 : 1 }}>
      <button
        className="btn"
        onClick={onAlternar}
        style={{
          width: "100%",
          padding: "14px 15px",
          display: "flex",
          gap: 11,
          alignItems: "center",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: sinProcesar ? "var(--line)" : color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 14.5,
            fontWeight: 500,
            textDecoration: hecha ? "line-through" : "none",
            color: sinProcesar ? "var(--ink2)" : "var(--ink)",
          }}
        >
          {captura.titulo ?? (procesando ? "Procesando…" : "Sin procesar todavía")}
        </span>
        {abierta ? (
          <ChevronDown size={16} color="var(--ink2)" />
        ) : (
          <ChevronRight size={16} color="var(--ink2)" />
        )}
      </button>

      {abierta && (
        <div style={{ padding: "0 15px 14px 33px" }}>
          {captura.descripcion && (
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--ink2)",
                margin: "0 0 12px",
                whiteSpace: "pre-wrap",
              }}
            >
              {captura.descripcion}
            </p>
          )}

          {captura.estructura && (
            <Bloque titulo="La letra, ordenada" texto={captura.estructura} />
          )}
          {captura.tipoCancion && (
            <Bloque titulo="Podría ser" texto={captura.tipoCancion} />
          )}

          {sinProcesar && (
            <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.55, marginBottom: 12 }}>
              {captura.error
                ? captura.error
                : tieneKey
                  ? "Está en la cola para procesarse."
                  : "Guardado. Se procesa en cuanto pongas la API key en Ajustes."}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {captura.audioBlob && (
              <Reproductor blob={captura.audioBlob} duracionMs={captura.duracionMs} />
            )}
            {sinProcesar && tieneKey && (
              <button
                className="btn chip"
                onClick={reintentar}
                disabled={procesando}
                style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
              >
                {procesando ? (
                  <Loader2 size={12} className="girando" />
                ) : (
                  <RotateCcw size={12} />
                )}
                {procesando ? "Procesando" : "Reintentar"}
              </button>
            )}
            <button
              className="btn chip"
              onClick={() => void cambiarEstado(captura.id!, hecha ? "procesada" : "hecha")}
              style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
            >
              <Check size={12} /> {hecha ? "Deshacer" : "Hecha"}
            </button>
            <button
              className="btn chip"
              onClick={() => void cambiarEstado(captura.id!, "eliminada")}
              style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="eyebrow" style={{ fontSize: 9.5 }}>
        {titulo}
      </div>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.6,
          margin: "4px 0 0",
          whiteSpace: "pre-wrap",
        }}
      >
        {texto}
      </p>
    </div>
  );
}
