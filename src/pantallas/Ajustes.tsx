import {
  Bell,
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
import { guardarTema, useTema, type Tema } from "../lib/tema";
import {
  estadoNotificaciones,
  pedirPermisoNotificaciones,
  reprogramarRecordatorios,
} from "../notificaciones";
import {
  CLAVE_API,
  CLAVE_MODELO,
  MODELO_POR_DEFECTO,
  guardarAjuste,
  leerAjuste,
} from "../ia/ajustes";
import { procesarPendientes } from "../ia/procesar";
import { APP_VERSION, buscarActualizacion, type EstadoActualizacion } from "../lib/version";
import { BotonPrincipal, Hoja } from "../ui/piezas";
import { Respaldo } from "./Respaldo";

export function Ajustes({
  sinProcesar,
  onClose,
}: {
  sinProcesar: number;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [modelo, setModelo] = useState(MODELO_POR_DEFECTO);
  const [verKey, setVerKey] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [estado, setEstado] = useState<"quieto" | "guardando" | "listo">("quieto");
  const [avisos, setAvisos] = useState({ disponible: false, concedido: false, programadas: 0 });
  const [actualizacion, setActualizacion] = useState<EstadoActualizacion>({ estado: "revisando" });
  const { tema } = useTema();

  const revisarActualizacion = () => {
    setActualizacion({ estado: "revisando" });
    void buscarActualizacion().then(setActualizacion);
  };

  useEffect(() => {
    void (async () => {
      setKey((await leerAjuste(CLAVE_API)) ?? "");
      setModelo((await leerAjuste(CLAVE_MODELO)) ?? MODELO_POR_DEFECTO);
      setAvisos(await estadoNotificaciones());
      setCargado(true);
    })();
    revisarActualizacion();
  }, []);

  const guardar = async () => {
    setEstado("guardando");
    await guardarAjuste(CLAVE_API, key);
    await guardarAjuste(CLAVE_MODELO, modelo === MODELO_POR_DEFECTO ? "" : modelo);
    // Con la key puesta, lo que estaba esperando se procesa solo.
    if (key.trim()) await procesarPendientes();
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
              background: tema === k ? "rgba(31,77,63,.10)" : "transparent",
              color: tema === k ? "var(--pino)" : "var(--ink2)",
            }}
          >
            <I size={14} /> {l}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "0 0 24px", lineHeight: 1.5 }}>
        «Sistema» sigue lo que tenga puesto tu teléfono.
      </p>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Inteligencia
      </div>
      <p style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, margin: "0 0 18px" }}>
        La key se guarda solo en este teléfono y va directo al proveedor. Sin ella la app funciona
        igual: graba y guarda, pero no transcribe ni ordena nada.
      </p>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
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
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Por defecto {MODELO_POR_DEFECTO}. Se puede cambiar sin tocar el código, porque los nombres
        de los modelos cambian cada pocos meses.
      </p>

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
        <p style={{ fontSize: 12, color: "var(--ink2)", margin: "8px 0 0", lineHeight: 1.5 }}>
          {avisos.disponible
            ? "El diario a las 8:00 pm, y cada pendiente la mañana del día en que vence. Si ya grabaste el diario, ese día no te avisa."
            : "En el navegador no se pueden programar avisos con la app cerrada. Instala el APK para tenerlos."}
        </p>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Actualizaciones
      </div>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 20 }}>
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
              onClick={() => window.open(actualizacion.url, "_blank")}
              style={{ padding: "5px 10px" }}
            >
              Descargar
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
        <p style={{ fontSize: 12, color: "var(--ink2)", margin: "8px 0 0", lineHeight: 1.5 }}>
          {actualizacion.estado === "disponible"
            ? "Descargar te lleva a la página del release en GitHub, donde está el APK."
            : "Se compara contra los releases publicados en el repositorio de GitHub."}
        </p>
      </div>

      {sinProcesar > 0 && (
        <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Hay {sinProcesar} {sinProcesar === 1 ? "grabación esperando" : "grabaciones esperando"}.
          Al guardar la key se procesan solas.
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

      <div style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

      <Respaldo />
    </Hoja>
  );
}
