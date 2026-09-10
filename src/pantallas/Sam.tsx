import { Bot, Mic, RefreshCw, Send, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { modoEnvioVozSam, type ModoEnvioVozSam } from "../ia/ajustes";
import { useReconocedor } from "../voz/reconocimiento";
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
  const [aviso, setAviso] = useState<string | null>(null);
  const [envioVoz, setEnvioVoz] = useState<ModoEnvioVozSam>("revisar");
  const siguienteId = useRef(1);
  const pulsandoMicrofono = useRef(false);

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
    if (!orden || enviando || (!desdeVoz && escuchando)) return;
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

  /**
   * Lo dictado ya viene transcrito por el teléfono: no se graba audio ni se
   * gasta cuota de la API en convertir voz a texto. La API queda para el
   * análisis del día y las capturas, que sí necesitan una IA.
   */
  const alTerminarDictado = (transcripcion: string) => {
    const dicho = transcripcion.trim();
    if (!dicho) {
      // El propio reconocedor explica por qué salió vacío (no se oyó nada, o
      // no contestó): pisarlo con un aviso genérico esconde la causa.
      setAviso(null);
      return;
    }
    if (envioVoz === "enviar") {
      setAviso(null);
      void enviar(dicho, true);
    } else {
      setTexto((actual) => (actual.trim() ? `${actual.trim()} ${dicho}` : dicho));
      setAviso("Revisa el texto y envíalo cuando esté listo.");
    }
  };

  const voz = useReconocedor(alTerminarDictado);
  const escuchando = voz.estado === "pidiendo" || voz.estado === "escuchando";

  const detenerRef = useRef(voz.detener);
  detenerRef.current = voz.detener;
  const cancelarRef = useRef(voz.cancelar);
  cancelarRef.current = voz.cancelar;

  const iniciarConPulsacion = (evento: React.PointerEvent) => {
    evento.preventDefault();
    if (enviando || escuchando) return;
    setAviso(null);
    pulsandoMicrofono.current = true;
    void voz.iniciar();
  };

  useEffect(() => {
    const soltar = () => {
      if (!pulsandoMicrofono.current) return;
      pulsandoMicrofono.current = false;
      detenerRef.current();
    };
    const cancelar = () => {
      if (!pulsandoMicrofono.current) return;
      pulsandoMicrofono.current = false;
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
        {(aviso ?? voz.error) && <div className="card" style={{ padding: "9px 11px", marginBottom: 8, fontSize: 12.5, color: "var(--ink2)" }}>{aviso ?? voz.error}</div>}
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
            disabled={enviando || escuchando}
            style={{ flex: 1, resize: "none", border: 0, outline: 0, background: "transparent", color: "var(--ink)", font: "inherit", lineHeight: 1.4, padding: "6px 5px" }}
          />
          {escuchando ? (
            <div aria-live="polite" style={{ minWidth: 76, height: 40, borderRadius: 999, display: "flex", justifyContent: "center", alignItems: "center", gap: 5, color: "var(--paper)", background: "var(--ambar)", flexShrink: 0 }}>
              <Mic size={15} />
              <span className="mono" style={{ fontSize: 10 }}>Oyendo</span>
            </div>
          ) : (
            <button className="btn" onPointerDown={iniciarConPulsacion} onContextMenu={(evento) => evento.preventDefault()} disabled={enviando} aria-label="Mantén pulsado para dictar una indicación" style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: "var(--pino)", flexShrink: 0, touchAction: "none", userSelect: "none" }}>
              <Mic size={18} />
            </button>
          )}
          <button className="btn" onClick={() => void enviar()} disabled={!texto.trim() || enviando || escuchando} aria-label="Enviar a Sam" style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: texto.trim() && !enviando && !escuchando ? "var(--pino)" : "var(--line)", flexShrink: 0 }}>
            <Send size={17} />
          </button>
        </div>
        {escuchando && (
          <div className="mono" style={{ marginTop: 7, paddingLeft: 3, fontSize: 10.5, color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {voz.parcial || `Suelta para ${envioVoz === "enviar" ? "enviar" : "corregir"}.`}
          </div>
        )}
      </div>
    </div>
  );
}
