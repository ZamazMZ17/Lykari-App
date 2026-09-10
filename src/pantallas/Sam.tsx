import { Bot, Loader2, Mic, RefreshCw, Send, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { modoEnvioVozSam, type ModoEnvioVozSam } from "../ia/ajustes";
import { transcribirIndicacion } from "../ia/transcribir";
import { duracionAudio, useGrabadora } from "../lib/grabacion";
import { estadoConexionLaptop } from "../sync/cliente";
import { enviarIndicacionASam } from "../sync/sam";
import { Header, Nota } from "../ui/piezas";

type Mensaje = {
  id: number;
  quien: "tu" | "sam";
  texto: string;
  error?: boolean;
};

export function Sam({ onBack, onAjustes }: { onBack: () => void; onAjustes: () => void }) {
  const [texto, setTexto] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [estado, setEstado] = useState<"comprobando" | "listo" | "sin-conexion">("comprobando");
  const [detalleEstado, setDetalleEstado] = useState("Comprobando conexión con tu laptop…");
  const [enviando, setEnviando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [envioVoz, setEnvioVoz] = useState<ModoEnvioVozSam>("revisar");
  const siguienteId = useRef(1);
  const pulsandoMicrofono = useRef(false);
  const inicioMicrofono = useRef<Promise<void> | null>(null);
  const grabacion = useGrabadora();
  const grabando = grabacion.estado === "pidiendo" || grabacion.estado === "grabando";

  const comprobar = useCallback(async () => {
    setEstado("comprobando");
    setDetalleEstado("Comprobando conexión con tu laptop…");
    try {
      await estadoConexionLaptop();
      setEstado("listo");
      setDetalleEstado("Sam está disponible en tu laptop.");
    } catch (error) {
      setEstado("sin-conexion");
      setDetalleEstado(error instanceof Error ? error.message : "No pude comprobar la conexión con Sam.");
    }
  }, []);

  useEffect(() => {
    void comprobar();
    void modoEnvioVozSam().then(setEnvioVoz);
  }, [comprobar]);

  useEffect(() => {
    const recargarModo = () => void modoEnvioVozSam().then(setEnvioVoz);
    window.addEventListener("lykari-ajustes-guardados", recargarModo);
    return () => window.removeEventListener("lykari-ajustes-guardados", recargarModo);
  }, []);

  const enviar = async (textoAEnviar = texto, desdeVoz = false) => {
    const orden = textoAEnviar.trim();
    if (!orden || enviando || (!desdeVoz && (grabando || transcribiendo))) return;
    setTexto("");
    setEnviando(true);
    setMensajes((actual) => [...actual, { id: siguienteId.current++, quien: "tu", texto: orden }]);
    try {
      const respuesta = await enviarIndicacionASam(orden);
      setMensajes((actual) => [...actual, { id: siguienteId.current++, quien: "sam", texto: respuesta }]);
      setEstado("listo");
      setDetalleEstado("Sam está disponible en tu laptop.");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No pude enviar esta indicación.";
      setMensajes((actual) => [...actual, { id: siguienteId.current++, quien: "sam", texto: mensaje, error: true }]);
      setEstado("sin-conexion");
      setDetalleEstado(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const detenerYTranscribir = async () => {
    const audio = await grabacion.detener();
    if (!audio) return;
    if (audio.duracionMs < 350) {
      setAviso("Habla un poco más para poder transcribir la indicación.");
      return;
    }
    setTranscribiendo(true);
    setAviso("Transcribiendo tu indicación…");
    try {
      const transcripcion = await transcribirIndicacion(audio.blob);
      if (envioVoz === "enviar") {
        setAviso("Enviando a Sam…");
        await enviar(transcripcion, true);
      } else {
        setTexto((actual) => actual.trim() ? `${actual.trim()} ${transcripcion}` : transcripcion);
        setAviso("Revisa el texto y envíalo cuando esté listo.");
      }
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No pude transcribir ese audio.");
    } finally {
      setTranscribiendo(false);
    }
  };

  const detenerRef = useRef(detenerYTranscribir);
  detenerRef.current = detenerYTranscribir;
  const cancelarRef = useRef(grabacion.cancelar);
  cancelarRef.current = grabacion.cancelar;

  const iniciarConPulsacion = (evento: React.PointerEvent) => {
    evento.preventDefault();
    if (enviando || transcribiendo || grabando) return;
    setAviso(null);
    pulsandoMicrofono.current = true;
    inicioMicrofono.current = grabacion.iniciar();
  };

  useEffect(() => {
    const soltar = () => {
      if (!pulsandoMicrofono.current) return;
      pulsandoMicrofono.current = false;
      void (async () => {
        await inicioMicrofono.current;
        inicioMicrofono.current = null;
        await detenerRef.current();
      })();
    };
    const cancelar = () => {
      if (!pulsandoMicrofono.current) return;
      pulsandoMicrofono.current = false;
      inicioMicrofono.current = null;
      cancelarRef.current();
    };
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
    return () => {
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
    };
  }, []);

  return (
    <div style={{ paddingBottom: 28 }}>
      <Header
        eyebrow="Tu laptop"
        title="Asistente Sam"
        onBack={onBack}
        right={
          <div style={{ display: "flex", gap: 7 }}>
            <button className="btn card" onClick={onAjustes} style={{ padding: 9, display: "flex" }} aria-label="Ajustes de Sam"><Settings size={18} /></button>
            <button className="btn card" onClick={() => void comprobar()} style={{ padding: 9, display: "flex" }} aria-label="Comprobar conexión"><RefreshCw size={18} /></button>
          </div>
        }
      />

      <div className="card" style={{ margin: "6px 20px 16px", padding: "13px 14px", display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Bot size={19} color="var(--pino)" style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 3 }}>
            {estado === "listo" ? "Conectado" : estado === "comprobando" ? "Comprobando" : "Sin conexión"}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.45 }}>{detalleEstado}</div>
        </div>
      </div>

      {mensajes.length === 0 ? (
        <Nota>Escribe o habla lo que necesitas. Revisa la transcripción y Sam lo hará en tu laptop.</Nota>
      ) : (
        <div style={{ padding: "0 20px", display: "grid", gap: 9 }}>
          {mensajes.map((mensaje) => (
            <div
              key={mensaje.id}
              className="card"
              style={{
                padding: "12px 13px",
                marginLeft: mensaje.quien === "tu" ? 30 : 0,
                marginRight: mensaje.quien === "sam" ? 30 : 0,
                background: mensaje.quien === "tu" ? "var(--tinte-pino)" : "var(--paper)",
                borderColor: mensaje.error ? "var(--line)" : undefined,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 4 }}>{mensaje.quien === "tu" ? "Tú" : "Sam"}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.48, color: mensaje.error ? "var(--ink2)" : "var(--ink)" }}>{mensaje.texto}</div>
            </div>
          ))}
          {enviando && <div className="mono" style={{ fontSize: 11, color: "var(--ink2)", padding: "2px 4px" }}>Sam está atendiendo tu indicación…</div>}
        </div>
      )}

      <div style={{ position: "sticky", bottom: 0, marginTop: 18, padding: "12px 20px 2px", background: "linear-gradient(transparent, var(--ground) 24%)" }}>
        {(aviso ?? grabacion.error) && <div className="card" style={{ padding: "9px 11px", marginBottom: 8, fontSize: 12.5, color: "var(--ink2)" }}>{aviso ?? grabacion.error}</div>}
        <div className="card" style={{ padding: 8, display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter" && !evento.shiftKey) {
                evento.preventDefault();
                void enviar();
              }
            }}
            placeholder="Escribe o mantén el micrófono para hablarle a Sam"
            aria-label="Indicación para Sam"
            rows={2}
            disabled={enviando || grabando || transcribiendo}
            style={{ flex: 1, resize: "none", border: 0, outline: 0, background: "transparent", color: "var(--ink)", font: "inherit", lineHeight: 1.4, padding: "6px 5px" }}
          />
          {grabando ? (
            <div aria-live="polite" style={{ minWidth: 76, height: 40, borderRadius: 999, display: "flex", justifyContent: "center", alignItems: "center", gap: 5, color: "var(--paper)", background: "var(--ambar)", flexShrink: 0 }}>
              <Mic size={15} />
              <span className="mono" style={{ fontSize: 10 }}>{duracionAudio(grabacion.ms)}</span>
            </div>
          ) : (
            <button className="btn" onPointerDown={iniciarConPulsacion} onContextMenu={(evento) => evento.preventDefault()} disabled={enviando || transcribiendo} aria-label="Mantén pulsado para grabar una indicación" style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: transcribiendo ? "var(--line)" : "var(--pino)", flexShrink: 0, touchAction: "none", userSelect: "none" }}>
              {transcribiendo ? <Loader2 className="girando" size={17} /> : <Mic size={18} />}
            </button>
          )}
          <button className="btn" onClick={() => void enviar()} disabled={!texto.trim() || enviando || grabando || transcribiendo} aria-label="Enviar a Sam" style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: texto.trim() && !enviando && !grabando && !transcribiendo ? "var(--pino)" : "var(--line)", flexShrink: 0 }}>
            <Send size={17} />
          </button>
        </div>
        {grabando && <div className="mono" style={{ marginTop: 7, paddingLeft: 3, fontSize: 10.5, color: "var(--ink2)" }}>Suelta para transcribir{envioVoz === "enviar" ? " y enviar" : " y corregir"}.</div>}
      </div>
    </div>
  );
}
