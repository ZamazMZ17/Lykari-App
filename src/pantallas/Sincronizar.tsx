import { Download, Eye, EyeOff, Laptop, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  configuracionSync,
  enviarALaptop,
  guardarConfiguracionSync,
  traerDeLaptop,
} from "../sync/cliente";

type Estado = "quieto" | "guardando" | "enviando" | "trayendo" | "listo" | "error";

/** Sincronización manual y explícita: la laptop es un puente, no un rastreador. */
export function Sincronizar() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [verToken, setVerToken] = useState(false);
  const [estado, setEstado] = useState<Estado>("quieto");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    void configuracionSync().then((c) => {
      setUrl(c.url);
      setToken(c.token);
    });
  }, []);

  const guardar = async () => {
    setEstado("guardando");
    await guardarConfiguracionSync(url, token);
    setEstado("listo");
    setMensaje("Conexión guardada en este dispositivo.");
  };
  const enviar = async () => {
    setEstado("enviando");
    try {
      await guardarConfiguracionSync(url, token);
      await enviarALaptop();
      setEstado("listo");
      setMensaje("Registro enviado a la laptop.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo enviar.");
    }
  };
  const traer = async () => {
    setEstado("trayendo");
    try {
      await guardarConfiguracionSync(url, token);
      await traerDeLaptop();
      setEstado("listo");
      setMensaje("Este dispositivo ahora refleja la copia de la laptop.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo traer la copia.");
    }
  };

  const ocupado = estado === "guardando" || estado === "enviando" || estado === "trayendo";

  return (
    <section>
      <div className="eyebrow" style={{ margin: "24px 0 8px" }}>Sincronización con laptop</div>
      <div className="card" style={{ padding: "13px 14px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <Laptop size={17} color="var(--pino)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: 0, lineHeight: 1.5 }}>
            Envía una copia completa a tu laptop o trae la última. Si ambos equipos cambiaron,
            la app te pedirá traer primero para no perder datos. En el APK la conexión es nativa
            y usa HTTPS; no depende del navegador.
          </p>
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tu-equipo:8585/api/lykari"
          inputMode="url"
          autoCapitalize="none"
          style={campo}
          aria-label="Dirección del puente de sincronización"
        />
        <div style={{ position: "relative", marginTop: 8 }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type={verToken ? "text" : "password"}
            placeholder="Clave de sincronización"
            autoComplete="off"
            style={{ ...campo, margin: 0, paddingRight: 44 }}
            aria-label="Clave de sincronización"
          />
          <button className="btn" onClick={() => setVerToken(!verToken)} aria-label="Mostrar u ocultar clave" style={{ position: "absolute", right: 12, top: 12, color: "var(--ink2)", display: "flex" }}>
            {verToken ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <button className="btn chip" disabled={ocupado} onClick={() => void guardar()} style={{ marginTop: 10, padding: "6px 10px" }}>
          Guardar conexión
        </button>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn" disabled={ocupado} onClick={() => void traer()} style={boton}>
            {estado === "trayendo" ? <Loader2 className="girando" size={15} /> : <Download size={15} />} Traer de laptop
          </button>
          <button className="btn" disabled={ocupado} onClick={() => void enviar()} style={{ ...boton, background: "var(--pino)", color: "var(--paper)", borderColor: "var(--pino)" }}>
            {estado === "enviando" ? <Loader2 className="girando" size={15} /> : <Upload size={15} />} Enviar a laptop
          </button>
        </div>
        {mensaje && <p style={{ fontSize: 12, lineHeight: 1.45, margin: "10px 0 0", color: estado === "error" ? "var(--ambar)" : "var(--ink2)" }}>{mensaje}</p>}
      </div>
    </section>
  );
}

const campo: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line)",
  background: "var(--ground)", fontSize: 13, fontFamily: "'JetBrains Mono Variable', monospace",
};
const boton: React.CSSProperties = {
  flex: 1, padding: "10px 6px", borderRadius: 10, border: "1px solid var(--line)",
  display: "flex", gap: 6, justifyContent: "center", alignItems: "center", fontSize: 12.5,
};
