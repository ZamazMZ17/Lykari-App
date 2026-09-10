import { Bot, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { estadoConexionLaptop } from "../sync/cliente";
import { enviarIndicacionASam } from "../sync/sam";
import { Header, Nota } from "../ui/piezas";

type Mensaje = {
  id: number;
  quien: "tu" | "sam";
  texto: string;
  error?: boolean;
};

export function Sam({ onBack }: { onBack: () => void }) {
  const [texto, setTexto] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [estado, setEstado] = useState<"comprobando" | "listo" | "sin-conexion">("comprobando");
  const [detalleEstado, setDetalleEstado] = useState("Comprobando conexión con tu laptop…");
  const [enviando, setEnviando] = useState(false);
  const siguienteId = useRef(1);

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

  useEffect(() => { void comprobar(); }, [comprobar]);

  const enviar = async () => {
    const orden = texto.trim();
    if (!orden || enviando) return;
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

  return (
    <div style={{ paddingBottom: 28 }}>
      <Header
        eyebrow="Tu laptop"
        title="Asistente Sam"
        onBack={onBack}
        right={
          <button className="btn card" onClick={() => void comprobar()} style={{ padding: 9, display: "flex" }} aria-label="Comprobar conexión">
            <RefreshCw size={18} />
          </button>
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
        <Nota>Escribe lo que necesitas. Sam lo hará en tu laptop y dejará su respuesta aquí.</Nota>
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
            placeholder="Escribe una indicación para Sam"
            aria-label="Indicación para Sam"
            rows={2}
            disabled={enviando}
            style={{ flex: 1, resize: "none", border: 0, outline: 0, background: "transparent", color: "var(--ink)", font: "inherit", lineHeight: 1.4, padding: "6px 5px" }}
          />
          <button className="btn" onClick={() => void enviar()} disabled={!texto.trim() || enviando} aria-label="Enviar a Sam" style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "var(--paper)", background: texto.trim() && !enviando ? "var(--pino)" : "var(--line)", flexShrink: 0 }}>
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
