import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Briefcase, Check, Dumbbell, EyeOff, Flag, Glasses, Hand, Leaf, Music, PawPrint, Pencil, PenLine, Video, X, type LucideIcon } from "lucide-react";
import { estaPuesta, estadoDeLaRacha, piezasDeLaSemana, semanaDe, type PiezaKey } from "../db/mascota";
import { db } from "../db/db";
import { diasConRegistro } from "../db/agregados";
import { CLAVE_MASCOTA_OCULTA, guardarAjuste } from "../ia/ajustes";
import { aISO, desdeISO, fechaCorta, sumarDias } from "../lib/fecha";
import { estaPausada } from "../lib/tiempo";
import { Husky } from "../ui/Husky";
import { CALMA_COMPANERO, NOMBRE_COMPANERO, useCompanero } from "../ui/useCompanero";
import { Hoja } from "../ui/piezas";
import "./HojaMascota.css";

const ICONO: Record<PiezaKey, LucideIcon> = { lentes: Glasses, pesa: Dumbbell, bandera: Flag, audifonos: Music, camara: Video, maletin: Briefcase, lapiz: PenLine };

export function HojaMascota({ onCamino, onClose }: { onCamino: () => void; onClose: () => void }) {
  const { nombre, tranquilo, dia } = useCompanero();
  const racha = useLiveQuery(() => estadoDeLaRacha(dia), [dia]);
  const piezas = useLiveQuery(() => piezasDeLaSemana(dia), [dia], []);
  const semana = semanaDe(dia);
  const huellas = useLiveQuery(() => diasConRegistro(semana.desde, dia), [semana.desde, dia]);
  const sesion = useLiveQuery(() => db.sesiones.where("abierta").equals(1).first(), []);
  const actividad = useLiveQuery(() => sesion ? db.actividades.get(sesion.actividadId) : undefined, [sesion?.actividadId]);
  const [vista, setVista] = useState<"huellas" | "piezas">("huellas");
  const [prueba, setPrueba] = useState<PiezaKey | null>(null);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [saludo, setSaludo] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const refugio = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!saludo) return;
    const fin = window.setTimeout(() => setSaludo(false), 850);
    return () => window.clearTimeout(fin);
  }, [saludo]);
  const puestas = piezas.filter(estaPuesta);
  const dias = racha?.dias ?? 0;
  const nudos = racha?.nudos ?? 0;
  const corriendo = !!sesion && !estaPausada(sesion);
  const probando = piezas.find(p => p.k === prueba);
  const equipadas = [...new Set([...puestas.map(p => p.k), ...(prueba ? [prueba] : [])])];

  async function guardar(clave: string, valor: string) {
    setGuardando(true);
    setError("");
    try { await guardarAjuste(clave, valor); return true; }
    catch { setError("No se pudo guardar el cambio. Puedes intentarlo otra vez."); return false; }
    finally { setGuardando(false); }
  }

  return <Hoja onClose={onClose} eyebrow="Tu compañero de camino" titulo="Un pequeño refugio">
    <section ref={refugio} className="comp-refugio" aria-label={`El refugio de ${nombre}`}>
      <svg className="comp-paisaje" viewBox="0 0 500 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <circle cx="385" cy="78" r="38" fill="var(--paper)" opacity=".8" />
        <path d="M-20 256 L118 90 L242 245 L344 133 L520 290 V350 H-20Z" fill="var(--line)" opacity=".55" />
        <path d="M78 139 L118 90 L158 140 L133 131 L119 142 L104 131Z M316 163 L344 133 L377 169 L346 158 L336 166Z" fill="var(--paper)" opacity=".75" />
        <path d="M-20 304 Q120 224 246 291 T520 279 V350 H-20Z" fill="var(--ground)" />
        <path d="M330 340 Q295 311 326 286 T315 265" fill="none" stroke="var(--ink2)" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" opacity=".35" />
      </svg>
      <div className={`comp-estado ${corriendo ? "comp-corriendo" : ""}`}>
        {corriendo ? <span className="comp-luz" /> : <Leaf size={12} />}
        {corriendo ? "En sesión contigo" : sesion ? "Una pausa contigo" : "A tu lado"}
      </div>
      <button className="btn comp-personaje" aria-label={`Saludar a ${nombre}`} onClick={() => setSaludo(true)} onAnimationEnd={() => setSaludo(false)}>
        <Husky size={220} racha={dias} nudos={nudos} piezas={equipadas} tranquilo={tranquilo || corriendo} atento={corriendo} saludo={saludo} />
      </button>
      <div className="comp-identidad">
        <div className="comp-nombre"><span className="disp">{nombre}</span><button className="btn comp-icono" aria-label="Cambiar nombre" onClick={() => { setBorrador(nombre); setEditando(true); }}><Pencil size={15} /></button></div>
        <span className="comp-subtitulo">Husky de expedición</span>
      </div>
      <span className="comp-saludar"><Hand size={12} /> Toca para saludar</span>
    </section>

    {editando && <form className="comp-editar" onSubmit={async e => { e.preventDefault(); if (borrador.trim() && await guardar(NOMBRE_COMPANERO, borrador.trim().slice(0, 24))) setEditando(false); }}>
      <label htmlFor="comp-nombre">¿Cómo se llama tu compañero?</label>
      <div><input id="comp-nombre" autoFocus maxLength={24} value={borrador} onChange={e => setBorrador(e.target.value)} required />
        <button className="btn comp-icono" disabled={guardando || !borrador.trim()} aria-label="Guardar nombre"><Check size={19} /></button>
        <button className="btn comp-icono" type="button" aria-label="Cancelar cambio de nombre" onClick={() => setEditando(false)}><X size={19} /></button></div>
    </form>}

    <p className="comp-mensaje" aria-live="polite">{probando ? `Probando: ${probando.nombre}. ${estaPuesta(probando) ? "Ya forma parte de su equipo esta semana." : "Es una vista previa; la pieza se equipa al alcanzar su registro."}` : corriendo ? `${actividad?.nombre || "Tu sesión"} está en marcha. Me quedo aquí, en silencio.` : sesion ? "Tu sesión está en pausa. Puedes retomarla desde la barra de sesión." : racha?.hoyRegistrado ? "La huella de hoy ya está en tu camino." : "Aquí empieza el siguiente registro. Puede ser algo pequeño."}</p>

    {prueba && <button className="btn comp-fin-prueba" onClick={() => setPrueba(null)}><X size={13} /> Terminar vista previa</button>}

    <div className="comp-tabs" role="group" aria-label="Contenido del compañero">
      <button className="btn" aria-pressed={vista === "huellas"} onClick={() => { setVista("huellas"); setPrueba(null); }}><PawPrint size={15} /> Tus huellas</button>
      <button className="btn" aria-pressed={vista === "piezas"} onClick={() => setVista("piezas")}><Glasses size={17} /> Su equipo <span className="mono">{puestas.length}/7</span></button>
    </div>

    {vista === "huellas" ? <div className="comp-huellas">
      <div className="comp-semana-titulo"><span className="eyebrow">Esta semana</span><span>{fechaCorta(semana.desde)} – {fechaCorta(semana.hasta)}</span></div>
      <div className="comp-semana">{Array.from({ length: 7 }, (_, i) => {
        const fecha = aISO(sumarDias(desdeISO(semana.desde), i));
        const registrada = huellas?.has(fecha);
        const estado = fecha > dia ? "Por venir" : registrada ? "Con registro" : huellas === undefined ? "Cargando" : "Sin registro";
        return <div key={fecha} className={`comp-dia ${registrada ? "comp-dia-hecho" : ""} ${fecha === dia ? "comp-dia-hoy" : ""}`} aria-label={`${fechaCorta(fecha)}: ${estado}`}>
          <span>{["L", "M", "X", "J", "V", "S", "D"][i]}</span><div>{registrada ? <PawPrint size={18} /> : <span className="comp-punto" />}</div>
        </div>;
      })}</div>
      <div className="comp-cifras">
        <div><strong className="mono">{racha ? dias : "—"}</strong><span>días con registro<br />en la racha actual</span></div>
        <div><strong className="mono comp-nudos">{racha ? nudos : "—"}</strong><span>nudos permanentes<br />en tu bufanda</span></div>
      </div>
      <p className="comp-nota">Cada 7 días ganados en una racha dejan un nudo. Los nudos se conservan aunque cambie tu ritmo.</p>
      <div className="comp-descanso"><Leaf size={16} /><span>{racha?.diaLibreUsado ? `Día libre usado el ${fechaCorta(racha.diaLibreUsado)}.` : "Un día libre por semana mantiene tu racha."} Los días vacíos quedan en gris.</span></div>
    </div> : <div className="comp-equipo">
      <p className="comp-nota">Su equipo refleja tus registros de esta semana. Toca una pieza para verla en el husky.</p>
      <div className="comp-piezas">{piezas.map(p => {
        const Icono = ICONO[p.k];
        const puesta = estaPuesta(p);
        return <button key={p.k} className={`btn comp-pieza ${prueba === p.k ? "comp-seleccionada" : ""}`} aria-pressed={prueba === p.k} onClick={() => {
          setPrueba(prueba === p.k ? null : p.k);
          refugio.current?.scrollIntoView({ block: "start", behavior: "instant" });
        }}>
          <span className="comp-pieza-icono" style={{ color: p.color }}><Icono size={22} strokeWidth={1.5} />{puesta && <Check size={11} />}</span>
          <span className="comp-pieza-titulo">{p.nombre}</span><span className="comp-pieza-area">{p.area}</span>
          <span className="comp-pieza-barra"><span style={{ width: `${Math.min(100, p.hecho / p.falta * 100)}%`, background: p.color }} /></span>
          <span className="comp-pieza-regla">{p.regla}</span><span className="mono comp-pieza-conteo">{p.hecho}/{p.falta} · {puesta ? "Equipada" : "Vista previa"}</span>
        </button>;
      })}</div>
    </div>}

    <button className="btn comp-camino" onClick={onCamino}>Ver mi camino completo <ArrowRight size={17} /></button>
    <button className="btn comp-calma" role="switch" aria-checked={tranquilo} disabled={guardando} onClick={() => void guardar(CALMA_COMPANERO, tranquilo ? "0" : "1")}>
      <Leaf size={18} /><span><strong>Compañía tranquila</strong><small>Sin animaciones. En sesión se activa sola.</small></span><span className="comp-switch" data-activo={tranquilo} />
    </button>
    {error && <p role="alert" className="comp-nota">{error}</p>}
    <button className="btn comp-esconder" disabled={guardando} onClick={async () => { if (await guardar(CLAVE_MASCOTA_OCULTA, dia)) onClose(); }}><EyeOff size={14} /> Esconder hasta mañana</button>
  </Hoja>;
}
