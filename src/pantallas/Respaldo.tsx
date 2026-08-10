import { AlertTriangle, Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import {
  exportarRespaldo,
  fechaLegible,
  leerRespaldo,
  restaurarRespaldo,
  type Respaldo as DatosRespaldo,
  type ResumenRespaldo,
} from "../exportar/respaldo";

type Estado =
  | { t: "quieto" }
  | { t: "exportando" }
  | { t: "confirmar"; respaldo: DatosRespaldo; resumen: ResumenRespaldo }
  | { t: "restaurando" }
  | { t: "listo"; texto: string }
  | { t: "error"; texto: string };

/**
 * Copia de seguridad: exportar todo el registro a un archivo y, en el otro
 * dispositivo, importarlo. Es la forma de compartir datos entre el celular y la
 * tablet sin servidor. Importar reemplaza, no mezcla, y se confirma antes.
 */
export function Respaldo() {
  const [estado, setEstado] = useState<Estado>({ t: "quieto" });
  const archivo = useRef<HTMLInputElement>(null);

  const exportar = async () => {
    setEstado({ t: "exportando" });
    try {
      await exportarRespaldo();
      setEstado({ t: "listo", texto: "Copia creada. Pásala al otro dispositivo e impórtala ahí." });
    } catch (e) {
      setEstado({ t: "error", texto: e instanceof Error ? e.message : "No se pudo exportar." });
    }
  };

  const alElegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!f) return;
    try {
      const { respaldo, resumen } = leerRespaldo(await f.text());
      setEstado({ t: "confirmar", respaldo, resumen });
    } catch (err) {
      setEstado({ t: "error", texto: err instanceof Error ? err.message : "No se pudo leer." });
    }
  };

  const restaurar = async (respaldo: DatosRespaldo) => {
    setEstado({ t: "restaurando" });
    try {
      await restaurarRespaldo(respaldo);
      setEstado({ t: "listo", texto: "Registro importado. Este dispositivo quedó igual a la copia." });
    } catch (e) {
      setEstado({ t: "error", texto: e instanceof Error ? e.message : "No se pudo importar." });
    }
  };

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Copia de seguridad
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 12px", lineHeight: 1.5 }}>
        Para pasar tu registro entre el celular y la tablet. No hay sincronización automática: es
        una copia que mueves tú. Importar reemplaza lo que haya en este dispositivo.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          className="btn card"
          onClick={exportar}
          disabled={estado.t === "exportando"}
          style={botonEstilo}
        >
          {estado.t === "exportando" ? (
            <Loader2 size={15} className="girando" />
          ) : (
            <Download size={15} />
          )}
          Exportar
        </button>
        <button
          className="btn card"
          onClick={() => archivo.current?.click()}
          disabled={estado.t === "restaurando"}
          style={botonEstilo}
        >
          {estado.t === "restaurando" ? (
            <Loader2 size={15} className="girando" />
          ) : (
            <Upload size={15} />
          )}
          Importar
        </button>
      </div>

      <input
        ref={archivo}
        type="file"
        accept="application/json,.json"
        onChange={alElegirArchivo}
        style={{ display: "none" }}
      />

      {estado.t === "confirmar" && (
        <div
          className="card"
          style={{
            padding: "13px 14px",
            marginTop: 4,
            borderColor: "var(--ambar)",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            <AlertTriangle size={16} color="var(--ambar)" style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5 }}>
              Esta copia es del {fechaLegible(estado.resumen.exportado)}. Al importarla,{" "}
              <strong style={{ color: "var(--ink)" }}>
                se reemplaza todo el registro de este dispositivo
              </strong>{" "}
              por el de la copia. Los ajustes (key, tema) no se tocan.
            </div>
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--ink2)", marginBottom: 12 }}>
            {estado.resumen.actividades} actividades · {estado.resumen.sesiones} sesiones ·{" "}
            {estado.resumen.capturas} capturas · {estado.resumen.tareas} tareas
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              onClick={() => void restaurar(estado.respaldo)}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                background: "var(--pino)",
                color: "var(--paper)",
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              Reemplazar
            </button>
            <button
              className="btn"
              onClick={() => setEstado({ t: "quieto" })}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                border: "1px solid var(--line)",
                color: "var(--ink2)",
                fontSize: 13.5,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(estado.t === "listo" || estado.t === "error") && (
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            margin: "4px 0 0",
            color: estado.t === "error" ? "var(--ambar)" : "var(--pino)",
          }}
        >
          {estado.texto}
        </p>
      )}
    </>
  );
}

const botonEstilo: React.CSSProperties = {
  flex: 1,
  padding: "12px 0",
  display: "flex",
  gap: 7,
  justifyContent: "center",
  alignItems: "center",
  fontSize: 13.5,
  fontWeight: 500,
};
