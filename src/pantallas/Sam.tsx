import { Mic, Send, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { modoEnvioVozSam, type ModoEnvioVozSam } from "../ia/ajustes";
import { useReconocedor } from "../voz/reconocimiento";
import { enviarIndicacionASam } from "../sync/sam";
import { Header } from "../ui/piezas";

type Mensaje = {
  id: number;
  quien: "tu" | "sam";
  texto: string;
  error?: boolean;
};

export function Sam({ onBack, onAjustes }: { onBack: () => void; onAjustes: () => void }) {
  const [texto, setTexto] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [envioVoz, setEnvioVoz] = useState<ModoEnvioVozSam>("revisar");
  const siguienteId = useRef(1);
  const pulsandoMicrofono = useRef(false);

  useEffect(() => {
    void modoEnvioVozSam().then(setEnvioVoz);
  }, []);

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
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No pude enviar esta indicación.";
      setMensajes((actual) => [...actual, { id: siguienteId.current++, quien: "sam", texto: mensaje, error: true }]);
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
      setAviso(null);
    }
  };

  const voz = useReconocedor(alTerminarDictado);
  const escuchando = voz.estado === "pidiendo" || voz.estado === "escuchando";

  const detenerRef = useRef(voz.detener);
  detenerRef.current = voz.detener;
  const cancelarRef = useRef(voz.cancelar);
  cancelarRef.current = voz.cancelar;

  const iniciarConPulsacion = (evento: React.PointerEvent<HTMLButtonElement>) => {
    evento.preventDefault();
    if (enviando || escuchando) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    setAviso(null);
    pulsandoMicrofono.current = true;
    void voz.iniciar();
  };

  const soltarMicrofono = (evento: React.PointerEvent<HTMLButtonElement>) => {
    evento.preventDefault();
    if (!pulsandoMicrofono.current) return;
    pulsandoMicrofono.current = false;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId);
    detenerRef.current();
  };

  const cancelarMicrofono = (evento: React.PointerEvent<HTMLButtonElement>) => {
    evento.preventDefault();
    if (!pulsandoMicrofono.current) return;
    pulsandoMicrofono.current = false;
    cancelarRef.current();
  };

  return (
    <div style={{ paddingBottom: 28 }}>
      <Header
        eyebrow="Tu laptop"
        title="Asistente Sam"
        onBack={onBack}
        right={
          <button className="btn card" onClick={onAjustes} style={{ padding: 9, display: "flex" }} aria-label="Ajustes de Sam"><Settings size={18} /></button>
        }
      />

      {mensajes.length > 0 && (
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
            placeholder="Escribe para Sam"
            aria-label="Indicación para Sam"
            rows={2}
            disabled={enviando || escuchando}
            style={{ flex: 1, resize: "none", border: 0, outline: 0, background: "transparent", color: "var(--ink)", font: "inherit", lineHeight: 1.4, padding: "6px 5px" }}
          />
          <button
            className="btn"
            onPointerDown={iniciarConPulsacion}
            onPointerUp={soltarMicrofono}
            onPointerCancel={cancelarMicrofono}
            onContextMenu={(evento) => evento.preventDefault()}
            disabled={enviando}
            aria-label="Mantén pulsado para dictar una indicación"
            aria-pressed={voz.estado === "escuchando"}
            style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: voz.estado === "escuchando" ? "var(--ambar)" : "var(--pino)", flexShrink: 0, touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
          >
            <Mic size={22} strokeWidth={2.25} />
          </button>
          <button className="btn" onClick={() => void enviar()} disabled={!texto.trim() || enviando || escuchando} aria-label="Enviar a Sam" style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: texto.trim() && !enviando && !escuchando ? "var(--pino)" : "var(--line)", flexShrink: 0 }}>
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
