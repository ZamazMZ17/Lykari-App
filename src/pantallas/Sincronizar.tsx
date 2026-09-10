import { CheckCircle2, Download, Eye, EyeOff, Laptop, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  configuracionSync,
  conservarDatosDeEsteTelefono,
  enviarALaptop,
  estadoConexionLaptop,
  guardarConfiguracionSync,
  guardarYConectar,
  probarConexionLaptop,
  traerDeLaptop,
  type EstadoConexionLaptop,
} from "../sync/cliente";

type Estado = "quieto" | "conectando" | "probando" | "enviando" | "trayendo" | "listo" | "error";

/** Sincronización manual y explícita: la laptop es un puente, no un rastreador. */
export function Sincronizar() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [verToken, setVerToken] = useState(false);
  const [estado, setEstado] = useState<Estado>("quieto");
  const [mensaje, setMensaje] = useState("");
  const [conexion, setConexion] = useState<EstadoConexionLaptop | null>(null);
  const [copiaExistente, setCopiaExistente] = useState<EstadoConexionLaptop | null>(null);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState("");

  useEffect(() => {
    void configuracionSync().then((c) => {
      setUrl(c.url);
      setToken(c.token);
      setUltimaSincronizacion(c.ultimaSincronizacion);
      if (c.url && c.token) {
        void estadoConexionLaptop().then(setConexion).catch(() => {});
      }
    });
  }, []);

  const guardar = async () => {
    setEstado("conectando");
    setMensaje("");
    setCopiaExistente(null);
    try {
      const resultado = await guardarYConectar(url, token);
      setConexion(resultado.estado);
      if (resultado.tipo === "copia-inicial") {
        setUltimaSincronizacion(new Date().toISOString());
        setMensaje("Conexión lista; primera copia guardada en laptop.");
      } else if (resultado.tipo === "copia-existente") {
        setCopiaExistente(resultado.estado);
        setMensaje("Esta laptop ya tiene una copia. Elige qué datos conservar.");
      } else {
        setMensaje("Conexión lista; esta laptop ya estaba enlazada.");
      }
      setEstado("listo");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo conectar.");
    }
  };
  const probar = async () => {
    setEstado("probando");
    setMensaje("");
    try {
      await guardarConfiguracionSync(url, token);
      const estadoLaptop = await probarConexionLaptop();
      setConexion(estadoLaptop);
      setMensaje(estadoLaptop.snapshot.exists
        ? `Conexión lista; copia de laptop en revisión ${estadoLaptop.snapshot.revision}.`
        : "Conexión lista; aún no hay copia en laptop.");
      setEstado("listo");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo comprobar la conexión.");
    }
  };
  const enviar = async () => {
    setEstado("enviando");
    try {
      await enviarALaptop();
      setEstado("listo");
      setUltimaSincronizacion(new Date().toISOString());
      setMensaje("Registro enviado a la laptop.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo enviar.");
    }
  };
  const traer = async () => {
    setEstado("trayendo");
    try {
      await traerDeLaptop();
      setEstado("listo");
      setUltimaSincronizacion(new Date().toISOString());
      setMensaje("Este dispositivo ahora refleja la copia de la laptop.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo traer la copia.");
    }
  };

  const elegirTraer = async () => {
    setEstado("trayendo");
    try {
      await traerDeLaptop();
      setCopiaExistente(null);
      setUltimaSincronizacion(new Date().toISOString());
      setMensaje("Este dispositivo ahora refleja la copia de la laptop.");
      setEstado("listo");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo traer la copia.");
    }
  };

  const elegirConservar = async () => {
    if (!copiaExistente) return;
    try {
      await conservarDatosDeEsteTelefono(copiaExistente.snapshot.revision);
      setCopiaExistente(null);
      setMensaje("Conexión guardada. Tus datos permanecen en este teléfono; Enviar cambios reemplazará la copia de laptop cuando tú lo elijas.");
      setEstado("listo");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar esta decisión.");
    }
  };

  const ocupado = estado === "conectando" || estado === "probando" || estado === "enviando" || estado === "trayendo";

  return (
    <section>
      <div className="eyebrow" style={{ margin: "24px 0 8px" }}>Sincronización con laptop</div>
      <div className="card" style={{ padding: "13px 14px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <Laptop size={17} color="var(--pino)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: 0, lineHeight: 1.5 }}>
            Pega la dirección que te da Tailscale y tu clave una sola vez. Lykari completa
            automáticamente la ruta interna; la conexión usa HTTPS y no depende del navegador.
          </p>
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tu-equipo.tu-tailnet.ts.net"
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
        <button className="btn chip" disabled={ocupado} onClick={() => void guardar()} style={{ marginTop: 10, padding: "6px 10px", display: "inline-flex", gap: 5, alignItems: "center" }}>
          {estado === "conectando" && <Loader2 className="girando" size={14} />}
          {estado === "conectando" ? "Conectando…" : "Guardar y conectar"}
        </button>
        <button className="btn chip" disabled={ocupado} onClick={() => void probar()} style={{ marginTop: 10, marginLeft: 8, padding: "6px 10px" }}>
          {estado === "probando" ? <Loader2 className="girando" size={14} /> : "Probar conexión"}
        </button>
        {conexion && !copiaExistente && (
          <>
            <p style={{ fontSize: 12, color: "var(--ink2)", margin: "12px 0 0", display: "flex", gap: 6, alignItems: "center" }}>
              <CheckCircle2 size={14} color="var(--pino)" />
              {conexion.snapshot.exists ? `Laptop conectada · copia ${conexion.snapshot.revision}` : "Laptop conectada · sin copia aún"}
              {ultimaSincronizacion && ` · última sincronización ${new Date(ultimaSincronizacion).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}`}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn" disabled={ocupado} onClick={() => void traer()} style={boton}>
                {estado === "trayendo" ? <Loader2 className="girando" size={15} /> : <Download size={15} />} Traer copia
              </button>
              <button className="btn" disabled={ocupado} onClick={() => void enviar()} style={{ ...boton, background: "var(--pino)", color: "var(--paper)", borderColor: "var(--pino)" }}>
                {estado === "enviando" ? <Loader2 className="girando" size={15} /> : <Upload size={15} />} Enviar cambios
              </button>
            </div>
          </>
        )}
        {copiaExistente && (
          <div className="card" style={{ marginTop: 12, padding: "11px 12px", background: "var(--ground)" }} role="alertdialog">
            <p style={{ fontSize: 12.5, lineHeight: 1.45, margin: "0 0 10px" }}>
              Ya existe una copia en la laptop. No se reemplazó nada.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" disabled={ocupado} onClick={() => void elegirTraer()} style={boton}>Traer copia de laptop</button>
              <button className="btn" disabled={ocupado} onClick={() => void elegirConservar()} style={{ ...boton, borderColor: "var(--pino)", color: "var(--pino)" }}>Conservar este teléfono</button>
            </div>
          </div>
        )}
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
