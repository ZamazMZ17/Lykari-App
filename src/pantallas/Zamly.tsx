import { useEffect, useState, type CSSProperties } from "react";
import { Flame, KeyRound, Lock, RotateCcw, Trophy } from "lucide-react";
import {
  establecerContrasena,
  eventosRecientes,
  metodoAcceso,
  msDeRachaActual,
  obtenerRacha,
  registrarRecaida,
  sincronizarHashNativo,
  tieneContrasena,
  verificarContrasena,
  type MetodoAcceso,
} from "../db/zamly";
import { PatronPad } from "./PatronPad";
import type { ZamlyEvento, ZamlyRacha } from "../db/db";
import { HORA } from "../lib/tiempo";
import { useTic } from "../lib/ganchos";
import { BotonPrincipal, Header } from "../ui/piezas";
import { Control } from "./control/Control";

function diasHoras(ms: number): { dias: number; horas: number } {
  const totalHoras = Math.floor(ms / HORA);
  return { dias: Math.floor(totalHoras / 24), horas: totalHoras % 24 };
}

const fechaHora = (ms: number) =>
  new Date(ms).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** La hoja se cierra sola al tocar fuera de la parte desbloqueada, como el resto de la app. */
export function Zamly({ onBack }: { onBack: () => void }) {
  const [estado, setEstado] = useState<"cargando" | "crear" | "ingresar" | "adentro">("cargando");
  const [metodo, setMetodo] = useState<MetodoAcceso>("patron");
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void tieneContrasena().then(async (si) => {
      if (si) setMetodo(await metodoAcceso());
      setEstado(si ? "ingresar" : "crear");
    });
  }, []);

  const verificar = async (secreto: string) => {
    const ok = await verificarContrasena(secreto);
    if (!ok) return setError(metodo === "patron" ? "Patrón incorrecto." : "Contraseña incorrecta.");
    // El motor nativo necesita el hash para "extender con contraseña" desde la
    // pantalla de bloqueo. Se refresca en cada ingreso por si se instaló recién.
    void sincronizarHashNativo();
    setEstado("adentro");
  };

  const alCrear = () => {
    void sincronizarHashNativo();
    setCambiando(false);
    setEstado("adentro");
  };

  const irACambiarMetodo = () => { setError(""); setCambiando(true); setEstado("crear"); };
  const volver = () => {
    if (estado === "crear" && cambiando) { setCambiando(false); setEstado("adentro"); }
    else onBack();
  };

  if (estado === "cargando") return null;
  if (estado === "adentro") return <ZamlyAdentro onBack={onBack} onCambiarMetodo={irACambiarMetodo} />;

  const titulo = estado === "crear" ? (cambiando ? "Cambiar acceso" : "Crear acceso") : "Acceso privado";

  return (
    <div style={{ paddingBottom: 20 }}>
      <Header eyebrow="Privado" title={titulo} onBack={volver} />
      <div style={{ padding: "0 20px", maxWidth: 460, margin: "0 auto" }}>
        <div style={{ display: "grid", placeItems: "center", margin: "8px 0 16px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--tinte-pino)" }}>
            <Lock size={24} color="var(--pino)" />
          </div>
        </div>

        {estado === "crear"
          ? <CrearAcceso onListo={alCrear} />
          : <IngresarAcceso metodo={metodo} onVerificar={verificar} error={error} setError={setError} />}
      </div>
    </div>
  );
}

/** Formulario de creación/cambio: elige patrón o contraseña y lo confirma. */
function CrearAcceso({ onListo }: { onListo: () => void }) {
  const [metodo, setMetodo] = useState<MetodoAcceso>("patron");
  const [valor, setValor] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [primerPatron, setPrimerPatron] = useState<string | null>(null);
  const [error, setError] = useState("");

  const enviarClave = async () => {
    if (valor.length < 4) return setError("Al menos 4 caracteres.");
    if (valor !== confirmar) return setError("No coinciden.");
    await establecerContrasena(valor, "clave");
    onListo();
  };

  const patronCreado = async (secuencia: string) => {
    if (secuencia.split("-").length < 4) return setError("Une al menos 4 puntos.");
    setError("");
    if (primerPatron === null) return setPrimerPatron(secuencia);
    if (secuencia !== primerPatron) {
      setPrimerPatron(null);
      return setError("Los patrones no coinciden. Empieza de nuevo.");
    }
    await establecerContrasena(secuencia, "patron");
    onListo();
  };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button className="btn" onClick={() => { setMetodo("patron"); setValor(""); setConfirmar(""); setPrimerPatron(null); setError(""); }} style={tabEstilo(metodo === "patron")}>Patrón</button>
        <button className="btn" onClick={() => { setMetodo("clave"); setPrimerPatron(null); setError(""); }} style={tabEstilo(metodo === "clave")}>Contraseña</button>
      </div>

      {metodo === "patron" ? (
        <>
          <p style={{ fontSize: 13, color: "var(--ink2)", textAlign: "center", margin: "0 0 6px" }}>
            {primerPatron === null ? "Une los puntos para dibujar tu patrón." : "Vuelve a dibujarlo para confirmar."}
          </p>
          <PatronPad key={primerPatron ?? "primero"} onCompletar={(s) => void patronCreado(s)} />
        </>
      ) : (
        <>
          <input value={valor} onChange={(e) => { setValor(e.target.value); setError(""); }} type="password" autoComplete="off" placeholder="Contraseña"
            style={campoEstilo} />
          <input value={confirmar} onChange={(e) => { setConfirmar(e.target.value); setError(""); }} type="password" autoComplete="off" placeholder="Repítela"
            style={campoEstilo} />
        </>
      )}

      {error && <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 12px", textAlign: "center" }}>{error}</p>}
      {metodo === "clave" && <BotonPrincipal onClick={() => void enviarClave()}>Guardar</BotonPrincipal>}
    </>
  );
}

function IngresarAcceso({ metodo, onVerificar, error, setError }: {
  metodo: MetodoAcceso;
  onVerificar: (secreto: string) => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [valor, setValor] = useState("");
  return (
    <>
      {metodo === "patron" ? (
        <>
          <p style={{ fontSize: 13, color: "var(--ink2)", textAlign: "center", margin: "0 0 6px" }}>Dibuja tu patrón para entrar.</p>
          <PatronPad onCompletar={(s) => onVerificar(s)} />
        </>
      ) : (
        <input value={valor} onChange={(e) => { setValor(e.target.value); setError(""); }} type="password" autoComplete="off" autoFocus placeholder="Contraseña"
          style={campoEstilo} />
      )}
      {error && <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 12px", textAlign: "center" }}>{error}</p>}
      {metodo === "clave" && <BotonPrincipal onClick={() => onVerificar(valor)}>Entrar</BotonPrincipal>}
    </>
  );
}

const campoEstilo: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--ground)",
  fontSize: 15,
  marginBottom: 10,
  boxSizing: "border-box",
};

function ZamlyAdentro({ onBack, onCambiarMetodo }: { onBack: () => void; onCambiarMetodo: () => void }) {
  const [tab, setTab] = useState<"racha" | "control">("racha");
  const [racha, setRacha] = useState<ZamlyRacha | null>(null);
  const [eventos, setEventos] = useState<ZamlyEvento[]>([]);
  const ahora = useTic(true, 60_000);

  const recargar = async () => {
    setRacha(await obtenerRacha());
    setEventos(await eventosRecientes());
  };

  useEffect(() => {
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ paddingBottom: 20 }}>
      <Header
        eyebrow="Privado"
        title={tab === "racha" ? "Racha" : "Control"}
        onBack={onBack}
        right={
          <button className="btn card" onClick={onCambiarMetodo} style={{ padding: 9, display: "flex" }} aria-label="Cambiar método de acceso">
            <KeyRound size={18} />
          </button>
        }
      />
      <div style={{ padding: "0 20px", maxWidth: 640, margin: "0 auto" }}>
        <div className="ct-tabs" role="tablist" style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button role="tab" aria-selected={tab === "racha"} className="btn" onClick={() => setTab("racha")} style={tabEstilo(tab === "racha")}>
            Racha
          </button>
          <button role="tab" aria-selected={tab === "control"} className="btn" onClick={() => setTab("control")} style={tabEstilo(tab === "control")}>
            Control
          </button>
        </div>

        {tab === "control" && <Control />}
        {tab === "racha" && !racha && <p style={{ fontSize: 13, color: "var(--ink2)" }}>Cargando…</p>}
        {tab === "racha" && racha && (
          <>
            <RachaPanel racha={racha} eventos={eventos} ahora={ahora} onRecargar={recargar} />
            <button className="btn" onClick={onCambiarMetodo} style={{ width: "100%", marginTop: 18, padding: "11px 0", borderRadius: 12, border: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "center", alignItems: "center", fontSize: 13.5, color: "var(--ink2)" }}>
              <KeyRound size={15} /> Cambiar método de acceso
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Metas de constancia. La barra/anillo avanza hacia la siguiente, sin castigo al reiniciar. */
const METAS = [1, 3, 7, 14, 30, 60, 90, 180, 365];
const DIA_MS = 24 * HORA;

function RachaPanel({
  racha,
  eventos,
  ahora,
  onRecargar,
}: {
  racha: ZamlyRacha;
  eventos: ZamlyEvento[];
  ahora: number;
  onRecargar: () => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [nota, setNota] = useState("");

  const ms = msDeRachaActual(racha, ahora);
  const { dias, horas } = diasHoras(ms);
  const minutos = Math.floor((ms % HORA) / 60_000);
  const { dias: diasRecord } = diasHoras(racha.mejorRachaMs);
  const esRecord = ms >= racha.mejorRachaMs && ms > 0;

  const meta = METAS.find((m) => m > dias) ?? null;
  const metaPrevia = [...METAS].reverse().find((m) => m <= dias) ?? 0;
  const fraccion = meta
    ? Math.min(1, Math.max(0, (ms - metaPrevia * DIA_MS) / ((meta - metaPrevia) * DIA_MS)))
    : 1;
  const inicio = racha.ultimaRecaida ?? racha.inicio;

  const confirmarRecaida = async () => {
    await registrarRecaida(nota);
    setNota("");
    setConfirmando(false);
    await onRecargar();
  };

  const R = 76;
  const grosor = 9;
  const r = R - grosor / 2;
  const circ = 2 * Math.PI * r;

  return (
    <>
      {/* Anillo de progreso hacia la próxima meta */}
      <div style={{ display: "grid", placeItems: "center", marginTop: 4 }}>
        <div style={{ position: "relative", width: R * 2, height: R * 2 }}>
          <svg width={R * 2} height={R * 2} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={R} cy={R} r={r} fill="none" stroke="var(--line)" strokeWidth={grosor} />
            <circle
              cx={R}
              cy={R}
              r={r}
              fill="none"
              stroke="var(--ambar)"
              strokeWidth={grosor}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - fraccion)}
              style={{ transition: "stroke-dashoffset .6s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, letterSpacing: "-.03em" }}>
                {dias}
              </div>
              <div className="eyebrow" style={{ marginTop: 4 }}>
                {dias === 1 ? "día" : "días"} limpio
              </div>
            </div>
          </div>
        </div>
        <div className="mono" style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 10 }}>
          {horas} h {String(minutos).padStart(2, "0")} min en curso
        </div>
        {meta ? (
          <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 4 }}>
            {meta - dias} {meta - dias === 1 ? "día" : "días"} para la meta de {meta}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ambar)", marginTop: 4 }}>Más de un año. Sostenido.</div>
        )}
      </div>

      {/* Estadísticas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "20px 0 14px" }}>
        <div className="card" style={{ padding: "12px 13px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Trophy size={14} color="var(--ambar)" />
            <span className="eyebrow">Récord</span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {diasRecord} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink2)" }}>{diasRecord === 1 ? "día" : "días"}</span>
          </div>
          {esRecord && <div style={{ fontSize: 11, color: "var(--ambar)", marginTop: 2 }}>tu mejor marca, ahora</div>}
        </div>
        <div className="card" style={{ padding: "12px 13px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Flame size={14} color="var(--ambar)" />
            <span className="eyebrow">Desde</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{fechaCorta(inicio)}</div>
          <div style={{ fontSize: 11, color: "var(--ink2)", marginTop: 2 }}>
            {eventos.length} {eventos.length === 1 ? "recaída" : "recaídas"} registradas
          </div>
        </div>
      </div>

      {/* Registrar recaída */}
      {confirmando ? (
        <div className="card" style={{ padding: 14, borderStyle: "dashed", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 10px" }}>
            La racha vuelve a empezar. El récord y lo ya recorrido quedan guardados.
          </p>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota opcional (qué pasó)"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--ground)",
              fontSize: 13.5,
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setConfirmando(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid var(--line)", fontSize: 13.5 }}>
              Cancelar
            </button>
            <button className="btn" onClick={() => void confirmarRecaida()} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid var(--line)", color: "var(--ink2)", fontSize: 13.5 }}>
              Sí, reiniciar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn"
          onClick={() => setConfirmando(true)}
          style={{ width: "100%", padding: "12px 0", marginBottom: 20, borderRadius: 12, border: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "center", alignItems: "center", fontSize: 13.5, color: "var(--ink2)" }}
        >
          <RotateCcw size={15} /> Registrar recaída
        </button>
      )}

      {/* Historial */}
      {eventos.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Historial</div>
          <div style={{ display: "grid", gap: 0, position: "relative" }}>
            {eventos.map((e, i) => (
              <div key={e.id} style={{ display: "flex", gap: 12, paddingBottom: i === eventos.length - 1 ? 0 : 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 9, height: 9, borderRadius: 999, background: "var(--ambar)", marginTop: 4, flexShrink: 0 }} />
                  {i !== eventos.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--line)", marginTop: 3 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 2 }}>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink2)" }}>{fechaHora(e.fecha)}</div>
                  {e.nota && <div style={{ fontSize: 13, marginTop: 2 }}>{e.nota}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const fechaCorta = (ms: number) =>
  new Date(ms).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

function tabEstilo(activo: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "9px 0",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: activo ? "var(--pino)" : "var(--paper)",
    color: activo ? "#fff" : "var(--ink2)",
    fontSize: 13.5,
    fontWeight: activo ? 600 : 400,
  };
}
