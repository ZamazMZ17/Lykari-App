import React, { useState, useEffect, useRef } from "react";
import {
  Play, Pause, Square, Plus, Mic, Music, Video, Briefcase, BookOpen,
  ListTodo, ChevronRight, ChevronDown, X, Check, Bell, Clock, FileText,
  Download, Dumbbell, Languages, Keyboard, ArrowLeft, Trash2, Target,
  Activity, LayoutGrid, PenLine, Tv, Moon, Timer, AlertTriangle
} from "lucide-react";

/* ── sistema de diseño ───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');

.app{
  --ground:#DCE0D9; --paper:#F3F5F0; --ink:#151A12; --ink2:#5D6656;
  --line:#C6CCC0; --pino:#1F4D3F; --ambar:#C98209;
  --musica:#7B4EA3; --video:#1E6E8C; --negocio:#A66200;
  --diario:#9C3F5C; --pend:#2F6B4F;
  font-family:'Instrument Sans',system-ui,sans-serif;
  color:var(--ink); background:var(--ground);
  -webkit-font-smoothing:antialiased;
}
.app *{box-sizing:border-box}
.disp{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.02em}
.mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
.card{background:var(--paper);border:1px solid var(--line);border-radius:14px}
.btn{border:none;background:none;cursor:pointer;font-family:inherit;color:inherit}
.btn:focus-visible{outline:2px solid var(--pino);outline-offset:2px}
.chip{font-size:11px;padding:2px 7px;border-radius:999px;border:1px solid var(--line);color:var(--ink2)}
.sheet{animation:up .22s cubic-bezier(.2,.8,.3,1)}
@keyframes up{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
.pulse{animation:p 2.4s ease-in-out infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.sheet,.pulse{animation:none}}
.noscroll::-webkit-scrollbar{display:none}
.noscroll{scrollbar-width:none}
`;

const ICONS = { book: BookOpen, dumbbell: Dumbbell, lang: Languages, key: Keyboard, tv: Tv, moon: Moon, act: Activity };

const ACTIVIDADES = [
  { id: 1, nom: "Leer libro del curso", icon: "book", alcance: "mes", meta: 30, hoy: 42, tipo: "enfoque" },
  { id: 2, nom: "Ejercicio", icon: "dumbbell", alcance: "semana", meta: 60, hoy: 0, tipo: "enfoque" },
  { id: 3, nom: "Inglés con serie", icon: "lang", alcance: "semana", meta: 45, hoy: 0, tipo: "recreativa" },
  { id: 4, nom: "Mecanografía", icon: "key", alcance: "mes", meta: 15, hoy: 15, tipo: "enfoque" },
  { id: 5, nom: "Escribir con la izquierda", icon: "act", alcance: "mes", meta: 10, hoy: 0, tipo: "enfoque" },
  { id: 6, nom: "Terminar informe de BD", icon: "book", alcance: "hoy", meta: 90, hoy: 0, tipo: "enfoque" },
];

const SECCIONES = [
  { k: "musica", nom: "Música", Icon: Music, color: "var(--musica)", n: 4, sub: "Letras e ideas sueltas" },
  { k: "video", nom: "Video", Icon: Video, color: "var(--video)", n: 7, sub: "Ideas para grabar" },
  { k: "negocio", nom: "Negocio", Icon: Briefcase, color: "var(--negocio)", n: 3, sub: "Ideas y qué haría falta" },
  { k: "diario", nom: "Diario", Icon: FileText, color: "var(--diario)", n: 12, sub: "Tu día, en tus palabras" },
  { k: "pend", nom: "Pendientes", Icon: ListTodo, color: "var(--pend)", n: 5, sub: "Con fecha y recordatorio" },
];

const IDEAS = {
  musica: [
    { t: "La casa que no volví a abrir", d: "Balada lenta, tono menor. La letra que tarareaste gira sobre volver a un sitio que ya no reconoces. Estructura sugerida: verso – verso – coro – puente – coro. Falta un coro: la parte que repetiste tres veces funciona como pre-coro, no como gancho." },
    { t: "Vuelta a casa a las 3", d: "Ritmo medio, guitarra limpia. Imagen central: las calles vacías. Sirve como verso; todavía no hay estribillo." },
    { t: "Tarareo sin letra — 24 jul", d: "Melodía de 12 segundos, sin palabras. Sin desarrollar." },
  ],
  video: [
    { t: "Cómo estudio para finales sin horario", d: "Formato: 6–8 min, cámara fija, ejemplos en pantalla. La idea central que grabaste: los horarios rígidos te fallaron y registrar lo real funcionó mejor. Necesita un antes y un después con datos tuyos para que no sea otro video de consejos." },
    { t: "Armar un sistema en C# capa por capa", d: "Serie de 4 partes. Base: los proyectos del curso. Pendiente decidir si muestras código en vivo o ya escrito." },
    { t: "Un mes registrando todo lo que hago", d: "Video resumen con las estadísticas de esta misma app. Solo se puede grabar cuando exista un mes de datos." },
  ],
  negocio: [
    { t: "Venta de laptops reacondicionadas", d: "Comprar equipos usados, limpiarlos y revenderlos con garantía corta. Lo que dijiste en el audio: empezar con conocidos de la universidad. Lo que no dijiste: de dónde sale el capital inicial ni quién repara. Sin eso, la idea no avanza." },
    { t: "Servicio de transcripción en español", d: "Aprovecha el trabajo que ya postulaste. Margen bajo si es manual." },
  ],
};

const DIARIO = [
  { f: "sáb 25 jul", txt: "Me desperté tarde otra vez, como a las diez. Sentí que ya había perdido la mañana antes de empezar. Igual me senté a leer y me duró más de lo que pensaba, casi cuarenta minutos, y eso me dejó tranquilo. Después me distraje con el celular y ahí se me fue la tarde. En la noche pensé en la idea de las laptops y me emocioné, pero no anoté nada concreto." },
  { f: "vie 24 jul", txt: "Día raro. Estuve con el informe de base de datos casi toda la tarde…" },
];

const PENDIENTES = [
  { t: "Lavar la ropa", d: "Sáb 26 jul", desc: "Salió del audio del jueves. Mencionaste que ya no te queda ropa limpia para la semana.", alarma: true, hecho: false },
  { t: "Sacar la basura", d: "Hoy, 8:00 pm", desc: "Se repite martes y sábado.", alarma: true, hecho: false },
  { t: "Enviar el avance del informe al grupo", d: "Lun 28 jul", desc: "Falta la parte de migración a Oracle. Dijiste que el grupo espera desde el martes.", alarma: true, hecho: false },
  { t: "Responder la prueba de transcripción", d: "Vence en 2 días", desc: "El audio de evaluación llegó el miércoles.", alarma: true, hecho: true },
];

const fmt = (s) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ── piezas ──────────────────────────────────────────────────────── */
function Anillo({ v, meta, size = 34, color = "var(--pino)" }) {
  const r = size / 2 - 3, c = 2 * Math.PI * r;
  const p = Math.min(1, meta ? v / meta : v > 0 ? 1 : 0);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
    </svg>
  );
}

function Barra({ v, meta, color = "var(--pino)" }) {
  const max = Math.max(meta, v, 1);
  return (
    <div style={{ position: "relative", height: 4, background: "var(--line)", borderRadius: 2, marginTop: 7 }}>
      <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: color, borderRadius: 2 }} />
      {meta > 0 && (
        <div title="referencia" style={{
          position: "absolute", left: `${(meta / max) * 100}%`, top: -3, width: 1.5, height: 10,
          background: "var(--ink2)", opacity: .5
        }} />
      )}
    </div>
  );
}

function Header({ eyebrow, title, right, onBack }) {
  return (
    <div style={{ padding: "18px 20px 10px", display: "flex", alignItems: "flex-end", gap: 12 }}>
      {onBack && (
        <button className="btn" onClick={onBack} style={{ marginBottom: 4 }} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="disp" style={{ fontSize: 27, margin: "3px 0 0", lineHeight: 1.05 }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

/* ── pantalla: HOY ───────────────────────────────────────────────── */
function Hoy({ onStart, onNueva, activa }) {
  const total = ACTIVIDADES.reduce((a, b) => a + b.hoy, 0);
  const alc = { hoy: "Solo hoy", semana: "Esta semana", mes: "Este mes" };
  return (
    <div style={{ paddingBottom: 20 }}>
      <Header eyebrow="Domingo 26 de julio" title="Tablón de hoy"
        right={<button className="btn card" onClick={onNueva} style={{ padding: 9, display: "flex" }} aria-label="Agregar actividad"><Plus size={18} /></button>} />

      <div style={{ display: "flex", gap: 8, padding: "6px 20px 16px" }}>
        {[["min registrados", total], ["sesiones", 3], ["actividades", "6"]].map(([l, v]) => (
          <div key={l} className="card" style={{ flex: 1, padding: "9px 10px" }}>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{v}</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 20px", display: "grid", gap: 8 }}>
        {ACTIVIDADES.map((a, i) => {
          const Ico = ICONS[a.icon];
          const esActiva = activa === a.id;
          return (
            <div key={a.id} className="card" style={{
              padding: "13px 14px", display: "flex", gap: 12, alignItems: "center",
              borderColor: esActiva ? "var(--ambar)" : "var(--line)"
            }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink2)", width: 16 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <Ico size={19} color="var(--pino)" strokeWidth={1.7} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.nom}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                  <span className="chip">{alc[a.alcance]}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>
                    {a.hoy > 0 ? `${a.hoy} min hoy` : "sin registro"}
                  </span>
                  {a.meta > 0 && <span className="mono" style={{ fontSize: 11, color: "var(--ink2)", opacity: .7 }}>· ref {a.meta}′</span>}
                </div>
                <Barra v={a.hoy} meta={a.meta} />
              </div>
              <button className="btn" onClick={() => onStart(a)} aria-label={`Iniciar ${a.nom}`}
                style={{
                  width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center",
                  background: esActiva ? "var(--ambar)" : "var(--pino)", color: "var(--paper)"
                }}>
                {esActiva ? <Pause size={17} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ padding: "16px 20px 0", fontSize: 12, color: "var(--ink2)", lineHeight: 1.5 }}>
        El tiempo de referencia no corta nada. Si lo pasas, no pasa nada: queda registrado lo que de verdad hiciste.
      </p>
    </div>
  );
}

/* ── pantalla: SESIÓN ────────────────────────────────────────────── */
function Sesion({ act, seg, corriendo, onToggle, onFin, onBack }) {
  const Ico = ICONS[act.icon];
  const min = Math.floor(seg / 60);
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <Header eyebrow="Sesión en curso" title={act.nom} onBack={onBack} />
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "10px 20px 0" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-grid", placeItems: "center", marginBottom: 22 }}>
            <svg width="196" height="196" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="98" cy="98" r="90" fill="none" stroke="var(--line)" strokeWidth="6" />
              <circle cx="98" cy="98" r="90" fill="none" stroke={corriendo ? "var(--ambar)" : "var(--ink2)"}
                strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 * (1 - Math.min(1, min / (act.meta || 60)))} />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <Ico size={22} color="var(--pino)" strokeWidth={1.6} />
              <div className="mono" style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>{fmt(seg)}</div>
              <div className={"eyebrow " + (corriendo ? "pulse" : "")} style={{ marginTop: 2 }}>
                {corriendo ? "grabando tiempo" : "en pausa"}
              </div>
            </div>
          </div>

          {act.meta > 0 && (
            <div className="mono" style={{ fontSize: 12, color: "var(--ink2)", marginBottom: 4 }}>
              querías darle {act.meta} min
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--ink2)", display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
            {act.tipo === "enfoque"
              ? <><Timer size={13} /> Se cierra sola a las 3 h si te olvidas</>
              : <><AlertTriangle size={13} /> No se cierra sola. Te aviso a las 2 h y sigue contando</>}
          </div>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", gap: 10 }}>
        <button className="btn card" onClick={onToggle} style={{ flex: 1, padding: "15px 0", display: "flex", justifyContent: "center", gap: 8, alignItems: "center", fontWeight: 500 }}>
          {corriendo ? <><Pause size={17} /> Pausar</> : <><Play size={17} /> Continuar</>}
        </button>
        <button className="btn" onClick={onFin} style={{ flex: 1, padding: "15px 0", borderRadius: 14, background: "var(--pino)", color: "var(--paper)", display: "flex", justifyContent: "center", gap: 8, alignItems: "center", fontWeight: 500 }}>
          <Square size={15} fill="currentColor" /> Finalizar
        </button>
      </div>
    </div>
  );
}

/* ── hoja: CERRAR SESIÓN ─────────────────────────────────────────── */
function Cerrar({ act, seg, onClose }) {
  const [grabando, setGrabando] = useState(false);
  const [listo, setListo] = useState(false);
  const [modo, setModo] = useState("audio");
  const [texto, setTexto] = useState("");
  const ok = listo || texto.trim().length > 10;
  return (
    <Hoja onClose={onClose} titulo="Antes de cerrar" eyebrow={`${act.nom} · ${Math.floor(seg / 60)} min`}>
      <p style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.55, margin: "0 0 18px" }}>
        Cuenta qué hiciste y cómo te fue. Sin esto la sesión queda como tiempo vacío y el análisis de la noche no puede decirte nada útil.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["audio", "Grabar", Mic], ["texto", "Escribir", PenLine]].map(([k, l, I]) => (
          <button key={k} className="btn" onClick={() => setModo(k)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, display: "flex", gap: 6,
            justifyContent: "center", alignItems: "center",
            background: modo === k ? "var(--ink)" : "transparent",
            color: modo === k ? "var(--paper)" : "var(--ink2)",
            border: `1px solid ${modo === k ? "var(--ink)" : "var(--line)"}`
          }}><I size={14} /> {l}</button>
        ))}
      </div>

      {modo === "audio" ? (
        <div style={{ textAlign: "center", padding: "6px 0 20px" }}>
          <button className="btn" onClick={() => { setGrabando(!grabando); if (grabando) setListo(true); }}
            style={{
              width: 82, height: 82, borderRadius: 999, display: "grid", placeItems: "center",
              background: grabando ? "var(--ambar)" : "var(--pino)", color: "var(--paper)", margin: "0 auto"
            }} aria-label={grabando ? "Detener grabación" : "Grabar"}>
            {grabando ? <Square size={26} fill="currentColor" /> : <Mic size={30} strokeWidth={1.6} />}
          </button>
          <div style={{ display: "flex", gap: 3, justifyContent: "center", height: 26, alignItems: "center", marginTop: 16 }}>
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} style={{
                width: 2.5, borderRadius: 2, background: grabando ? "var(--ambar)" : "var(--line)",
                height: grabando ? 5 + Math.abs(Math.sin(i * 1.7)) * 21 : 4
              }} />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink2)", marginTop: 10 }}>
            {grabando ? "0:14 · toca para terminar" : listo ? "audio listo · 0:47" : "toca para hablar"}
          </div>
        </div>
      ) : (
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Hice tres series pero descansé mucho entre cada una…"
          style={{
            width: "100%", minHeight: 118, padding: 13, borderRadius: 12, border: "1px solid var(--line)",
            background: "var(--ground)", fontFamily: "inherit", fontSize: 14, resize: "none", color: "var(--ink)"
          }} />
      )}

      <button className="btn" disabled={!ok} onClick={onClose} style={{
        width: "100%", padding: "15px 0", borderRadius: 14, marginTop: 14, fontWeight: 500,
        background: ok ? "var(--pino)" : "var(--line)", color: ok ? "var(--paper)" : "var(--ink2)"
      }}>Guardar sesión</button>
      <button className="btn" onClick={onClose} style={{ width: "100%", padding: "12px 0 2px", fontSize: 12.5, color: "var(--ink2)" }}>
        Guardar y dejar el audio pendiente
      </button>
    </Hoja>
  );
}

/* ── hoja genérica ───────────────────────────────────────────────── */
function Hoja({ children, onClose, titulo, eyebrow }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(21,26,18,.4)", display: "flex", alignItems: "flex-end", zIndex: 40 }}
      onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: "var(--paper)", borderRadius: "20px 20px 0 0", padding: "18px 20px 24px",
        maxHeight: "88%", overflowY: "auto", borderTop: "1px solid var(--line)"
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="disp" style={{ fontSize: 21, margin: "3px 0 0" }}>{titulo}</h2>
          </div>
          <button className="btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── hoja: NUEVA ACTIVIDAD ───────────────────────────────────────── */
function NuevaActividad({ onClose }) {
  const [alc, setAlc] = useState("semana");
  const [tipo, setTipo] = useState("enfoque");
  const [meta, setMeta] = useState(30);
  const [icon, setIcon] = useState("book");
  return (
    <Hoja onClose={onClose} eyebrow="Tablón" titulo="Nueva actividad">
      <input placeholder="¿Qué quieres hacer?" style={{
        width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid var(--line)",
        background: "var(--ground)", fontFamily: "inherit", fontSize: 15, marginBottom: 18, color: "var(--ink)"
      }} />

      <div className="eyebrow" style={{ marginBottom: 8 }}>Ícono</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {Object.entries(ICONS).map(([k, I]) => (
          <button key={k} className="btn" onClick={() => setIcon(k)} aria-label={k} style={{
            width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center",
            border: `1px solid ${icon === k ? "var(--pino)" : "var(--line)"}`,
            background: icon === k ? "var(--pino)" : "transparent",
            color: icon === k ? "var(--paper)" : "var(--ink2)"
          }}><I size={18} strokeWidth={1.7} /></button>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Aparece en el tablón</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["hoy", "Solo hoy"], ["semana", "Toda la semana"], ["mes", "Todo el mes"]].map(([k, l]) => (
          <button key={k} className="btn" onClick={() => setAlc(k)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12.5,
            border: `1px solid ${alc === k ? "var(--ink)" : "var(--line)"}`,
            background: alc === k ? "var(--ink)" : "transparent",
            color: alc === k ? "var(--paper)" : "var(--ink2)"
          }}>{l}</button>
        ))}
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Tiempo de referencia</div>
      <div className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <Target size={17} color="var(--ink2)" />
        <div className="mono" style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>{meta} min</div>
        <button className="btn" onClick={() => setMeta(Math.max(0, meta - 5))} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)" }}>−</button>
        <button className="btn" onClick={() => setMeta(meta + 5)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)" }}>+</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink2)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Solo se muestra como marca. No corta la sesión ni cuenta como fallo.
      </p>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Si te olvidas de cerrarla</div>
      <div style={{ display: "grid", gap: 6, marginBottom: 22 }}>
        {[["enfoque", "Ciérrala a las 3 h", "Para estudiar, leer, ejercicio."],
        ["recreativa", "Avísame y sigue contando", "Para series y películas: cerrarla escondería el tiempo real."]].map(([k, l, s]) => (
          <button key={k} className="btn" onClick={() => setTipo(k)} style={{
            textAlign: "left", padding: "11px 13px", borderRadius: 12,
            border: `1px solid ${tipo === k ? "var(--pino)" : "var(--line)"}`,
            background: tipo === k ? "rgba(31,77,63,.07)" : "transparent"
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
              {tipo === k && <Check size={14} color="var(--pino)" />}{l}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 2 }}>{s}</div>
          </button>
        ))}
      </div>

      <button className="btn" onClick={onClose} style={{ width: "100%", padding: "15px 0", borderRadius: 14, background: "var(--pino)", color: "var(--paper)", fontWeight: 500 }}>
        Agregar al tablón
      </button>
    </Hoja>
  );
}

/* ── pantalla: CAPTURAR ──────────────────────────────────────────── */
function Capturar({ onOpen }) {
  return (
    <div style={{ paddingBottom: 20 }}>
      <Header eyebrow="Habla y déjalo ahí" title="Capturar" />
      <div style={{ padding: "6px 20px 0", display: "grid", gap: 8 }}>
        {SECCIONES.map(({ k, nom, Icon, color, n, sub }) => (
          <button key={k} className="btn card" onClick={() => onOpen(k)} style={{
            padding: "15px 15px", display: "flex", alignItems: "center", gap: 14, textAlign: "left"
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: color }}>
              <Icon size={19} color="var(--paper)" strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 500 }}>{nom}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 1 }}>{sub}</div>
            </div>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink2)" }}>{n}</span>
            <ChevronRight size={17} color="var(--ink2)" />
          </button>
        ))}
      </div>
      <div className="card" style={{ margin: "16px 20px 0", padding: 14, display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Bell size={16} color="var(--diario)" style={{ marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5 }}>
          A las 8:00 pm te recuerdo el diario si no grabaste nada. Música, video y negocio no avisan: son para cuando aparecen.
        </div>
      </div>
    </div>
  );
}

/* ── pantalla: LISTA DE IDEAS ────────────────────────────────────── */
function Ideas({ sec, onBack }) {
  const [abierta, setAbierta] = useState(0);
  const meta = SECCIONES.find((s) => s.k === sec);
  const items = IDEAS[sec] || [];
  return (
    <div style={{ paddingBottom: 90 }}>
      <Header eyebrow="Capturar" title={meta.nom} onBack={onBack} />
      <div style={{ padding: "6px 20px 0", display: "grid", gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} className="card" style={{ overflow: "hidden" }}>
            <button className="btn" onClick={() => setAbierta(abierta === i ? -1 : i)} style={{
              width: "100%", padding: "14px 15px", display: "flex", gap: 11, alignItems: "center", textAlign: "left"
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 999, background: meta.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{it.t}</span>
              {abierta === i ? <ChevronDown size={16} color="var(--ink2)" /> : <ChevronRight size={16} color="var(--ink2)" />}
            </button>
            {abierta === i && (
              <div style={{ padding: "0 15px 14px 33px" }}>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)", margin: "0 0 12px" }}>{it.d}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn chip" style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}><Check size={12} /> Hecha</button>
                  <button className="btn chip" style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}><Trash2 size={12} /> Eliminar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <BotonGrabar color={meta.color} label="Mantén para grabar" />
    </div>
  );
}

/* ── pantalla: DIARIO ────────────────────────────────────────────── */
function Diario({ onBack }) {
  return (
    <div style={{ paddingBottom: 90 }}>
      <Header eyebrow="Capturar" title="Diario" onBack={onBack}
        right={<button className="btn card" style={{ padding: 9, display: "flex" }} aria-label="Exportar"><Download size={17} /></button>} />
      <div style={{ padding: "6px 20px 0" }}>
        <div className="card" style={{ padding: "16px 17px", marginBottom: 8 }}>
          <div className="eyebrow" style={{ color: "var(--diario)" }}>{DIARIO[0].f} · escrito por ti, en tus palabras</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.68, margin: "10px 0 0", fontFamily: "'Fraunces',Georgia,serif", fontWeight: 400 }}>
            {DIARIO[0].txt}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button className="btn chip" style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}><FileText size={12} /> Ver .docx</button>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>de un audio de 3:12</span>
          </div>
        </div>
        {DIARIO.slice(1).map((d, i) => (
          <button key={i} className="btn card" style={{ width: "100%", padding: "13px 15px", display: "flex", gap: 10, alignItems: "center", textAlign: "left", marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink2)", width: 62 }}>{d.f}</span>
            <span style={{ flex: 1, fontSize: 13.5, color: "var(--ink2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.txt}</span>
            <ChevronRight size={15} color="var(--ink2)" />
          </button>
        ))}
        <div className="card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", borderStyle: "dashed" }}>
          <Bell size={15} color="var(--diario)" />
          <span style={{ fontSize: 12.5, color: "var(--ink2)" }}>Hoy todavía no grabas nada. Te aviso a las 8:00 pm.</span>
        </div>
      </div>
      <BotonGrabar color="var(--diario)" label="Cuenta cómo fue tu día" />
    </div>
  );
}

/* ── pantalla: PENDIENTES ────────────────────────────────────────── */
function Pendientes({ onBack }) {
  const [items, setItems] = useState(PENDIENTES);
  const [abierta, setAbierta] = useState(-1);
  const toggle = (i) => setItems(items.map((t, j) => (j === i ? { ...t, hecho: !t.hecho } : t)));
  return (
    <div style={{ paddingBottom: 90 }}>
      <Header eyebrow="Capturar" title="Pendientes" onBack={onBack} />
      <div style={{ padding: "6px 20px 0", display: "grid", gap: 8 }}>
        {items.map((t, i) => (
          <div key={i} className="card" style={{ overflow: "hidden", opacity: t.hecho ? .55 : 1 }}>
            <div style={{ padding: "13px 15px", display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn" onClick={() => toggle(i)} aria-label="Marcar hecha" style={{
                width: 21, height: 21, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center",
                border: `1.5px solid ${t.hecho ? "var(--pend)" : "var(--line)"}`,
                background: t.hecho ? "var(--pend)" : "transparent"
              }}>{t.hecho && <Check size={13} color="var(--paper)" strokeWidth={3} />}</button>
              <button className="btn" onClick={() => setAbierta(abierta === i ? -1 : i)} style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, textDecoration: t.hecho ? "line-through" : "none" }}>{t.t}</div>
                <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink2)", display: "flex", gap: 4, alignItems: "center" }}>
                    <Clock size={11} /> {t.d}
                  </span>
                  {t.alarma && <Bell size={11} color="var(--ink2)" />}
                </div>
              </button>
              {abierta === i ? <ChevronDown size={16} color="var(--ink2)" /> : <ChevronRight size={16} color="var(--ink2)" />}
            </div>
            {abierta === i && (
              <div style={{ padding: "0 15px 14px 48px" }}>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink2)", margin: "0 0 10px" }}>{t.desc}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn chip" style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}><Clock size={12} /> Cambiar fecha</button>
                  <button className="btn chip" style={{ display: "flex", gap: 5, alignItems: "center", padding: "5px 10px" }}><Trash2 size={12} /> Eliminar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <BotonGrabar color="var(--pend)" label="Di lo que tienes que hacer" />
    </div>
  );
}

function BotonGrabar({ color, label }) {
  return (
    <div style={{ position: "absolute", bottom: 78, left: 0, right: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: color, color: "var(--paper)", padding: "11px 18px 11px 14px", borderRadius: 999, boxShadow: "0 6px 20px rgba(21,26,18,.22)" }}>
        <Mic size={19} strokeWidth={1.8} />
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}

/* ── pantalla: CAMINO (feedback) ─────────────────────────────────── */
const DIAS = Array.from({ length: 26 }, (_, i) => ({ d: i + 1, v: [0, 0, 35, 60, 20, 0, 75, 90, 40, 0, 0, 55, 80, 30, 65, 0, 45, 70, 25, 0, 50, 85, 35, 0, 60, 57][i] || 0 }));
const SEMANAS = Array.from({ length: 30 }, (_, i) => ({ d: i + 1, v: Math.round([20, 45, 60, 30, 55, 70, 25, 50, 65, 40, 35, 60, 45, 20, 55, 75, 30, 50, 40, 65, 25, 45, 70, 35, 55, 60, 30, 50, 45, 52][i]) }));
const MESES = [["ene", 42], ["feb", 55], ["mar", 30], ["abr", 61], ["may", 48], ["jun", 25], ["jul", 57], ["ago", 0], ["set", 0], ["oct", 0], ["nov", 0], ["dic", 0]];

function Camino() {
  const [zoom, setZoom] = useState("dia");
  const [sel, setSel] = useState(26);
  const rail = useRef(null);
  useEffect(() => { if (rail.current) rail.current.scrollLeft = rail.current.scrollWidth; }, [zoom]);

  const datos = zoom === "dia" ? DIAS : zoom === "semana" ? SEMANAS : MESES.map(([m, v], i) => ({ d: i + 1, v, lbl: m }));
  const size = zoom === "dia" ? 38 : zoom === "semana" ? 26 : 44;

  return (
    <div style={{ paddingBottom: 20 }}>
      <Header eyebrow="Tu registro en el tiempo" title="El camino" />

      <div style={{ display: "flex", gap: 6, padding: "4px 20px 14px" }}>
        {[["dia", "Días"], ["semana", "Semanas"], ["mes", "Meses"]].map(([k, l]) => (
          <button key={k} className="btn" onClick={() => setZoom(k)} style={{
            flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 12.5,
            border: `1px solid ${zoom === k ? "var(--ink)" : "var(--line)"}`,
            background: zoom === k ? "var(--ink)" : "transparent",
            color: zoom === k ? "var(--paper)" : "var(--ink2)"
          }}>{l}</button>
        ))}
      </div>

      <div ref={rail} className="noscroll" style={{ overflowX: "auto", padding: "0 20px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: zoom === "semana" ? 6 : 9, position: "relative", paddingBottom: 8 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: size / 2, height: 1, background: "var(--line)" }} />
          {datos.map((p, i) => {
            const activo = zoom === "dia" ? sel === p.d : i === datos.length - (zoom === "mes" ? 6 : 1);
            return (
              <button key={i} className="btn" onClick={() => zoom === "dia" && setSel(p.d)} style={{ position: "relative", flexShrink: 0, textAlign: "center" }}>
                <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
                  <Anillo v={p.v} meta={100} size={size} color={p.v === 0 ? "var(--line)" : activo ? "var(--ambar)" : "var(--pino)"} />
                  <span className="mono" style={{ position: "absolute", fontSize: zoom === "semana" ? 8.5 : 10.5, fontWeight: activo ? 700 : 400, color: p.v === 0 ? "var(--ink2)" : "var(--ink)" }}>
                    {p.lbl || p.d}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="eyebrow" style={{ padding: "2px 20px 16px" }}>
        {zoom === "dia" ? "julio 2026 · el relleno es tiempo registrado" : zoom === "semana" ? "semanas del año" : "2026"}
      </div>

      <div style={{ padding: "0 20px", display: "grid", gap: 8 }}>
        <div className="card" style={{ padding: "16px 17px" }}>
          <div className="eyebrow">Análisis del sábado 25</div>
          <h3 className="disp" style={{ fontSize: 19, margin: "6px 0 14px", lineHeight: 1.2 }}>
            Registraste 2 h 15, casi todo en una sola cosa.
          </h3>
          <Fila color="var(--pino)" t="Se sostuvo" d="Lectura: siete días seguidos. Es lo único con racha real, y hoy fue más de lo que te propusiste." />
          <Fila color="var(--diario)" t="Se cayó" d="Ejercicio: cero registros en once días, aunque sigue en el tablón desde el 5 de julio. La actividad está viva solo en la lista." />
          <Fila color="var(--negocio)" t="El costo" d="Cuatro horas de serie en inglés en dos días contra veinte minutos de mecanografía. Lo cuentas como estudio, pero el audio que grabaste dice que no estabas leyendo subtítulos." />
          <Fila color="var(--video)" t="Lo que se repite" d="En cinco de los últimos siete audios dijiste que empezaste tarde. Nunca es la actividad la que falla, es la hora de arranque." last />
        </div>

        <div className="card" style={{ padding: "16px 17px" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Reparto de la semana</div>
          {[["Lectura", 190, "var(--pino)"], ["Series en inglés", 240, "var(--video)"], ["Informe de BD", 95, "var(--negocio)"], ["Mecanografía", 20, "var(--musica)"], ["Ejercicio", 0, "var(--diario)"]].map(([n, v, c]) => (
            <div key={n} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 1 }}>
                <span>{n}</span><span className="mono" style={{ color: "var(--ink2)" }}>{v} min</span>
              </div>
              <div style={{ height: 5, background: "var(--line)", borderRadius: 3 }}>
                <div style={{ width: `${(v / 240) * 100}%`, height: "100%", background: c, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 11, alignItems: "flex-start", borderStyle: "dashed" }}>
          <LayoutGrid size={16} color="var(--ink2)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.55 }}>
            El análisis se arma con lo que registraste. Los días vacíos se muestran vacíos: no se inventa una conclusión sobre lo que no hay.
          </div>
        </div>
      </div>
    </div>
  );
}

function Fila({ color, t, d, last }) {
  return (
    <div style={{ display: "flex", gap: 11, paddingBottom: last ? 0 : 13, marginBottom: last ? 0 : 13, borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <div style={{ width: 3, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div>
        <div className="eyebrow" style={{ color, fontSize: 9.5 }}>{t}</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: "4px 0 0" }}>{d}</p>
      </div>
    </div>
  );
}

/* ── shell ───────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("hoy");
  const [sub, setSub] = useState(null);
  const [modal, setModal] = useState(null);
  const [act, setAct] = useState(null);
  const [seg, setSeg] = useState(0);
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [corriendo]);

  const iniciar = (a) => { setAct(a); setSeg(0); setCorriendo(true); setSub("sesion"); };

  let pantalla;
  if (sub === "sesion" && act) {
    pantalla = <Sesion act={act} seg={seg} corriendo={corriendo} onToggle={() => setCorriendo(!corriendo)}
      onFin={() => { setCorriendo(false); setModal("cerrar"); }} onBack={() => setSub(null)} />;
  } else if (sub === "diario") pantalla = <Diario onBack={() => setSub(null)} />;
  else if (sub === "pend") pantalla = <Pendientes onBack={() => setSub(null)} />;
  else if (sub) pantalla = <Ideas sec={sub} onBack={() => setSub(null)} />;
  else if (tab === "hoy") pantalla = <Hoy onStart={iniciar} onNueva={() => setModal("nueva")} activa={corriendo ? act?.id : null} />;
  else if (tab === "capturar") pantalla = <Capturar onOpen={setSub} />;
  else pantalla = <Camino />;

  const enSesion = sub === "sesion";

  return (
    <div className="app" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "0" }}>
      <style>{CSS}</style>
      <div style={{
        width: "100%", maxWidth: 420, height: "100vh", maxHeight: 900, position: "relative",
        overflow: "hidden", background: "var(--ground)", display: "flex", flexDirection: "column"
      }}>
        <div className="noscroll" style={{ flex: 1, overflowY: "auto" }}>{pantalla}</div>

        {act && corriendo && !enSesion && (
          <button className="btn" onClick={() => setSub("sesion")} style={{
            margin: "0 14px 8px", padding: "11px 14px", borderRadius: 13, background: "var(--ink)",
            color: "var(--paper)", display: "flex", alignItems: "center", gap: 11, textAlign: "left"
          }}>
            <div className="pulse" style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ambar)" }} />
            <span style={{ flex: 1, fontSize: 13.5 }}>{act.nom}</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{fmt(seg)}</span>
            <Pause size={16} />
          </button>
        )}

        <nav style={{ display: "flex", borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
          {[["hoy", "Hoy", LayoutGrid], ["capturar", "Capturar", Mic], ["camino", "Camino", Activity]].map(([k, l, I]) => (
            <button key={k} className="btn" onClick={() => { setTab(k); setSub(null); }} style={{
              flex: 1, padding: "11px 0 14px", display: "grid", placeItems: "center", gap: 4,
              color: tab === k ? "var(--pino)" : "var(--ink2)"
            }}>
              <I size={20} strokeWidth={tab === k ? 2.1 : 1.6} />
              <span style={{ fontSize: 10.5, fontWeight: tab === k ? 600 : 400 }}>{l}</span>
            </button>
          ))}
        </nav>

        {modal === "nueva" && <NuevaActividad onClose={() => setModal(null)} />}
        {modal === "cerrar" && act && <Cerrar act={act} seg={seg} onClose={() => { setModal(null); setSub(null); setAct(null); }} />}
      </div>
    </div>
  );
}
