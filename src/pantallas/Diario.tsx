import { ChevronRight, Download, Loader2, PenLine, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Captura } from "../db/db";
import { cambiarEstado } from "../db/capturas";
import { procesarCaptura } from "../ia/procesar";
import { exportarDiario } from "../exportar/docx";
import { fechaCorta, hoyISO } from "../lib/fecha";
import { BotonGrabar } from "../ui/BotonGrabar";
import { Reproductor } from "../ui/Audio";
import { Header, Nota } from "../ui/piezas";
import type { Seccion } from "./Capturar";

export function Diario({
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
  const [selId, setSelId] = useState<number | null>(null);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarDiario(items);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo exportar.");
      setTimeout(() => setAviso(null), 4000);
    } finally {
      setExportando(false);
    }
  };
  const sel = items.find((c) => c.id === selId) ?? items[0];
  const resto = items.filter((c) => c.id !== sel?.id);
  const hayHoy = items.some((c) => c.fecha === hoyISO());

  return (
    <div style={{ paddingBottom: 132 }}>
      <Header
        eyebrow="Capturar"
        title="Diario"
        onBack={onBack}
        right={
          items.length > 0 ? (
            <button
              className="btn card"
              onClick={exportar}
              disabled={exportando}
              style={{ padding: 9, display: "flex" }}
              aria-label="Exportar el diario a Word"
            >
              {exportando ? (
                <Loader2 size={17} className="girando" />
              ) : (
                <Download size={17} />
              )}
            </button>
          ) : undefined
        }
      />

      {aviso && (
        <div style={{ padding: "0 20px 8px", fontSize: 12.5, color: "var(--ink2)" }}>{aviso}</div>
      )}

      <div style={{ padding: "6px 20px 0" }}>
        {sel ? (
          <Entrada captura={sel} tieneKey={tieneKey} />
        ) : (
          <Nota icono={<PenLine size={16} color="var(--diario)" style={{ marginTop: 1 }} />}>
            Todavía no hay ninguna noche escrita. Toca el botón, cuenta cómo te fue y la IA lo
            deja escrito en primera persona, como si lo hubieras escrito tú.
          </Nota>
        )}

        {resto.map((c) => (
          <button
            key={c.id}
            className="btn card"
            onClick={() => setSelId(c.id!)}
            style={{
              width: "100%",
              padding: "13px 15px",
              display: "flex",
              gap: 10,
              alignItems: "center",
              textAlign: "left",
              marginTop: 8,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 11.5, color: "var(--ink2)", width: 62, flexShrink: 0 }}
            >
              {fechaCorta(c.fecha)}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13.5,
                color: "var(--ink2)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {c.descripcion ?? c.transcripcion ?? "Sin procesar todavía"}
            </span>
            <ChevronRight size={15} color="var(--ink2)" />
          </button>
        ))}

        {!hayHoy && items.length > 0 && (
          <div
            className="card"
            style={{
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              alignItems: "center",
              borderStyle: "dashed",
              marginTop: 8,
            }}
          >
            <PenLine size={15} color="var(--diario)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "var(--ink2)" }}>
              Hoy todavía no grabas nada.
            </span>
          </div>
        )}
      </div>

      <BotonGrabar tipo="diario" color={seccion.color} label={seccion.label} />
    </div>
  );
}

function Entrada({ captura, tieneKey }: { captura: Captura; tieneKey: boolean }) {
  const [procesando, setProcesando] = useState(false);
  const sinProcesar = captura.estado === "nueva";

  const reintentar = async () => {
    setProcesando(true);
    try {
      await procesarCaptura(captura.id!);
    } catch {
      // El error queda guardado en la captura y se muestra abajo.
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="card" style={{ padding: "16px 17px" }}>
      <div className="eyebrow" style={{ color: "var(--diario)" }}>
        {fechaCorta(captura.fecha)}
        {captura.descripcion ? " · escrito por ti, en tus palabras" : ""}
      </div>

      {captura.descripcion ? (
        <p
          className="disp"
          style={{
            fontSize: 14.5,
            lineHeight: 1.68,
            margin: "10px 0 0",
            fontWeight: 400,
            whiteSpace: "pre-wrap",
          }}
        >
          {captura.descripcion}
        </p>
      ) : (
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)", margin: "10px 0 0" }}>
          {captura.error ??
            (tieneKey
              ? "Está en la cola para escribirse."
              : "El audio está guardado. Se escribe en cuanto pongas la API key en Ajustes.")}
        </p>
      )}

      <div
        style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}
      >
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
            {procesando ? <Loader2 size={12} className="girando" /> : <RotateCcw size={12} />}
            {procesando ? "Escribiendo" : "Reintentar"}
          </button>
        )}
        <button
          className="btn chip"
          onClick={() => void cambiarEstado(captura.id!, "eliminada")}
          style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}
        >
          <Trash2 size={12} /> Eliminar
        </button>
      </div>
    </div>
  );
}
