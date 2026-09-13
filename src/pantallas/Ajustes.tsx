import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  RotateCcw,
  Sun,
  SunMoon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { esNativo } from "../lib/plataforma";
import { descargarEInstalarApk } from "../lib/instalador";
import { sembrarCiclo6 } from "../db/semillaCiclo6";
import { guardarTema, useTema, type Tema } from "../lib/tema";
import {
  estadoNotificaciones,
  pedirPermisoNotificaciones,
  reprogramarRecordatorios,
} from "../notificaciones";
import {
  CLAVE_API,
  CLAVE_MODELO,
  CLAVE_SAM_VOZ_ENVIO,
  MODELO_POR_DEFECTO,
  guardarAjuste,
  leerAjuste,
  modoEnvioVozSam,
  type ModoEnvioVozSam,
} from "../ia/ajustes";
import { procesarPendientes } from "../ia/procesar";
import { APP_VERSION, buscarActualizacion, type EstadoActualizacion } from "../lib/version";
import { BotonPrincipal, Hoja } from "../ui/piezas";
import { Respaldo } from "./Respaldo";
import { Sincronizar } from "./Sincronizar";

export function Ajustes({
  sinProcesar,
  onClose,
}: {
  sinProcesar: number;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [modelo, setModelo] = useState(MODELO_POR_DEFECTO);
  const [envioVozSam, setEnvioVozSam] = useState<ModoEnvioVozSam>("revisar");
  const [verKey, setVerKey] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [estado, setEstado] = useState<"quieto" | "guardando" | "listo">("quieto");
  const [avisos, setAvisos] = useState({ disponible: false, concedido: false, programadas: 0 });
  const [actualizacion, setActualizacion] = useState<EstadoActualizacion>({ estado: "revisando" });
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [errorInstalar, setErrorInstalar] = useState<string | null>(null);
  const { tema } = useTema();

  const cargarCursos = async () => {
    setCargandoCursos(true);
    try {
      await sembrarCiclo6();
    } finally {
      setCargandoCursos(false);
    }
  };

  const revisarActualizacion = () => {
    setActualizacion({ estado: "revisando" });
    void buscarActualizacion().then(setActualizacion);
  };

  /** En Android el APK se baja dentro de Lykari y se entrega directamente al
   * instalador del sistema. Nunca navega a GitHub ni abre una pestaña. */
  const descargar = async () => {
    if (actualizacion.estado !== "disponible") return;
    setInstalando(true);
    setErrorInstalar(null);
    try {
      if (esNativo) await descargarEInstalarApk(actualizacion.assetUrl);
      else window.open(actualizacion.assetUrl, "_blank");
    } catch (e) {
      setErrorInstalar(e instanceof Error ? e.message : "No se pudo descargar la actualización.");
    } finally {
      setInstalando(false);
    }
  };

  useEffect(() => {
    void (async () => {
      setKey((await leerAjuste(CLAVE_API)) ?? "");
      setModelo((await leerAjuste(CLAVE_MODELO)) ?? MODELO_POR_DEFECTO);
      setEnvioVozSam(await modoEnvioVozSam());
      setAvisos(await estadoNotificaciones());
      setCargado(true);
    })();
    revisarActualizacion();
  }, []);

  const guardar = async () => {
    setEstado("guardando");
    await guardarAjuste(CLAVE_API, key);
    await guardarAjuste(CLAVE_MODELO, modelo === MODELO_POR_DEFECTO ? "" : modelo);
    await guardarAjuste(CLAVE_SAM_VOZ_ENVIO, envioVozSam === "enviar" ? "enviar" : "");
    // Con la key puesta, lo que estaba esperando se procesa solo.
    if (key.trim()) await procesarPendientes();
    revisarActualizacion();
    window.dispatchEvent(new Event("lykari-ajustes-guardados"));
    setEstado("listo");
    setTimeout(onClose, 700);
  };

  return (
    <Hoja onClose={onClose} eyebrow="Ajustes" titulo="Ajustes">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Apariencia
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {(
          [
            ["claro", "Claro", Sun],
            ["oscuro", "Oscuro", Moon],
            ["sistema", "Sistema", SunMoon],
          ] as [Tema, string, typeof Sun][]
        ).map(([k, l, I]) => (
          <button
            key={k}
            className="btn"
            onClick={() => void guardarTema(k)}
            aria-pressed={tema === k}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              fontSize: 12.5,
              display: "flex",
              gap: 6,
              justifyContent: "center",
              alignItems: "center",
              border: `1px solid ${tema === k ? "var(--pino)" : "var(--line)"}`,
              background: tema === k ? "var(--tinte-pino)" : "transparent",
              color: tema === k ? "var(--pino)" : "var(--ink2)",
            }}
          >
            <I size={14} /> {l}
          </button>
        ))}
      </div>
      <div className="eyebrow" style={{ margin: "24px 0 8px" }}>
        API key de Gemini
      </div>
      <div style={{ position: "relative", marginBottom: 18 }}>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type={verKey ? "text" : "password"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={cargado ? "AIza…" : "Cargando…"}
          style={{
            width: "100%",
            padding: "13px 44px 13px 14px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--ground)",
            fontSize: 14,
            fontFamily: "'JetBrains Mono Variable', monospace",
          }}
        />
        <button
          className="btn"
          onClick={() => setVerKey(!verKey)}
          aria-label={verKey ? "Ocultar la key" : "Mostrar la key"}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink2)",
            display: "flex",
          }}
        >
          {verKey ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Modelo
      </div>
      <input
        value={modelo}
        onChange={(e) => setModelo(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--ground)",
          fontSize: 14,
          fontFamily: "'JetBrains Mono Variable', monospace",
          marginBottom: 8,
        }}
      />
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "0 0 20px" }}>
        Por defecto {MODELO_POR_DEFECTO}.
      </p>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Órdenes por voz a Sam
      </div>
      <div className="card" style={{ padding: "8px", marginBottom: 20, display: "grid", gap: 6 }}>
        {(
          [
            ["revisar", "Revisar antes de enviar", "Al soltar, transcribe y deja el texto para corregir."],
            ["enviar", "Enviar al soltar", "Al soltar, transcribe y manda la orden a Sam."],
          ] as [ModoEnvioVozSam, string, string][]
        ).map(([modo, titulo, detalle]) => (
          <button
            key={modo}
            className="btn"
            onClick={() => setEnvioVozSam(modo)}
            aria-pressed={envioVozSam === modo}
            style={{
              padding: "9px 10px",
              borderRadius: 9,
              textAlign: "left",
              border: `1px solid ${envioVozSam === modo ? "var(--pino)" : "transparent"}`,
              background: envioVozSam === modo ? "var(--tinte-pino)" : "transparent",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: envioVozSam === modo ? "var(--pino)" : "var(--ink)" }}>{titulo}</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "var(--ink2)", marginTop: 2 }}>{detalle}</div>
          </button>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Recordatorios
      </div>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Bell size={16} color={avisos.concedido ? "var(--pino)" : "var(--ink2)"} />
          <div style={{ flex: 1, fontSize: 13 }}>
            {!avisos.disponible
              ? "Solo en la app instalada"
              : avisos.concedido
                ? `Activos · ${avisos.programadas} programados`
                : "Sin permiso"}
          </div>
          {avisos.disponible && !avisos.concedido && (
            <button
              className="btn chip"
              onClick={async () => {
                await pedirPermisoNotificaciones();
                await reprogramarRecordatorios();
                setAvisos(await estadoNotificaciones());
              }}
              style={{ padding: "5px 10px" }}
            >
              Activar
            </button>
          )}
        </div>
        {avisos.disponible && (
          <p style={{ fontSize: 12, color: "var(--ink2)", margin: "8px 0 0", lineHeight: 1.5 }}>
            Diario a las 8:00 pm y cada pendiente la mañana en que vence.
          </p>
        )}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Actualizaciones
      </div>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Download
            size={16}
            color={actualizacion.estado === "disponible" ? "var(--pino)" : "var(--ink2)"}
          />
          <div style={{ flex: 1, fontSize: 13 }}>
            {actualizacion.estado === "revisando" && "Buscando…"}
            {actualizacion.estado === "al-dia" && `Tienes la última versión (v${APP_VERSION})`}
            {actualizacion.estado === "sin-releases" &&
              `Estás en v${APP_VERSION}. Todavía no hay releases publicadas en GitHub.`}
            {actualizacion.estado === "error" && "No se pudo revisar ahora."}
            {actualizacion.estado === "disponible" && `Hay una versión nueva: v${actualizacion.version}`}
          </div>
          {actualizacion.estado === "disponible" ? (
            <button
              className="btn chip"
              onClick={() => void descargar()}
              disabled={instalando}
              style={{ padding: "5px 10px", display: "flex", gap: 5, alignItems: "center" }}
            >
              {instalando && <Loader2 size={12} className="girando" />}
              {instalando ? "Descargando…" : "Descargar"}
            </button>
          ) : (
            <button
              className="btn"
              onClick={revisarActualizacion}
              disabled={actualizacion.estado === "revisando"}
              aria-label="Revisar de nuevo"
              style={{ color: "var(--ink2)", display: "flex" }}
            >
              <RotateCcw size={15} className={actualizacion.estado === "revisando" ? "girando" : undefined} />
            </button>
          )}
        </div>
        {errorInstalar && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, fontSize: 12, color: "var(--ink2)" }}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            {errorInstalar}
          </div>
        )}
      </div>

      {sinProcesar > 0 && (
        <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 16px" }}>
          {sinProcesar} {sinProcesar === 1 ? "grabación esperando" : "grabaciones esperando"}.
        </p>
      )}

      <BotonPrincipal disabled={estado !== "quieto"} onClick={guardar}>
        {estado === "guardando" ? (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <Loader2 size={16} className="girando" /> Guardando…
          </span>
        ) : estado === "listo" ? (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <Check size={16} /> Guardado
          </span>
        ) : (
          "Guardar"
        )}
      </BotonPrincipal>

      <div className="eyebrow" style={{ margin: "20px 0 8px" }}>
        Ciclo 6
      </div>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <CalendarDays size={16} color="var(--ink2)" />
          <div style={{ flex: 1, fontSize: 13 }}>Cursos y horarios del ciclo</div>
          <button
            className="btn chip"
            disabled={cargandoCursos}
            onClick={() => void cargarCursos()}
            style={{ padding: "5px 10px" }}
          >
            {cargandoCursos ? "Cargando…" : "Cargar"}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

      <Sincronizar />

      <div style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

      <Respaldo />
    </Hoja>
  );
}
