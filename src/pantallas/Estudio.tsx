import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, FileText, Layers, RotateCcw } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { cursosActivos } from "../db/cursos";
import { CONTENIDO_CICLO6, contenidoParaCurso, type ContenidoCurso } from "../estudio/contenidoCiclo6";
import { sembrarPreguntas } from "../estudio/semilla";
import { QUIZ_PUERTA, SIMULACRO_PRACTICA, type ConfiguracionQuiz } from "../estudio/configuracionQuiz";
import { periodosDisponibles, tipoPeriodoCurso, type RangoPeriodoEstudio } from "../estudio/periodos";
import { db } from "../db/db";
import { hoyISO } from "../lib/fecha";
import { registrarTiempoEstudio, resumirEstudio, type ResumenEstudio } from "../estudio/sesiones";
import type { TipoActividadEstudio } from "../estudio/tipos";

type OpcionCurso = { id: number; nombre: string; contenido: ContenidoCurso };
type Modo = "inicio" | "tarjetas" | "conceptos";

export function Estudio({ onBack, onQuiz }: { onBack: () => void; onQuiz: (cursoId: number, configuracion: ConfiguracionQuiz) => void }) {
  const cursos = useLiveQuery(cursosActivos, [], []);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [modo, setModo] = useState<Modo>("inicio");
  const [tarjeta, setTarjeta] = useState(0);
  const [girada, setGirada] = useState(false);
  const [rango, setRango] = useState<RangoPeriodoEstudio | undefined>();
  const sesiones = useLiveQuery(() => db.sesionesEstudio.toArray(), [], []);
  const resumen = useMemo(() => resumirEstudio(sesiones), [sesiones]);
  const resumenHoy = useMemo(() => resumirEstudio(sesiones.filter((sesion) => sesion.fecha === hoyISO())), [sesiones]);

  useEffect(() => { void sembrarPreguntas(); }, []);

  const opciones = useMemo<OpcionCurso[]>(() => {
    const activas = cursos.flatMap((curso) => {
      const contenido = contenidoParaCurso(curso.nombre);
      return contenido && curso.id != null ? [{ id: curso.id, nombre: curso.nombre, contenido }] : [];
    });
    return activas.length > 0
      ? activas
      : CONTENIDO_CICLO6.map((contenido, indice) => ({ id: -(indice + 1), nombre: contenido.nombre, contenido }));
  }, [cursos]);

  const elegida = opciones.find((opcion) => opcion.id === cursoId);
  useEffect(() => {
    if (!elegida) return;
    const tipo = tipoPeriodoCurso(elegida.nombre);
    const periodos = periodosDisponibles(elegida.contenido.preguntas, tipo);
    if (periodos.length > 0) setRango({ tipo, desde: periodos[0], hasta: periodos.at(-1)! });
  }, [cursoId]);
  const volver = () => {
    if (modo !== "inicio") {
      setModo("inicio");
      setTarjeta(0);
      setGirada(false);
      return;
    }
    if (cursoId != null) {
      setCursoId(null);
      return;
    }
    onBack();
  };

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={volver} aria-label="Volver"><ArrowLeft size={20} /></button>
        <div>
          <span className="eyebrow">Estudio · Ciclo 6</span>
          <h1 className="disp" style={{ fontSize: 22 }}>
            {elegida ? elegida.nombre : "Material de tus cursos"}
          </h1>
        </div>
      </header>

      <main className="qz-body">
        {!elegida ? (
          <>
            <p className="qz-intro">Elige un curso. El contenido se preparó a partir de sus PPT y PDF, no de fechas ni porcentajes del aula.</p>
            <div className="qz-cursos">
              {opciones.map((opcion) => (
                <button key={opcion.id} className="qz-curso" onClick={() => setCursoId(opcion.id)}>
                  <span className="qz-curso-icono"><BookOpen size={20} /></span>
                  <span className="qz-curso-info"><strong>{opcion.nombre}</strong><small>{opcion.contenido.preguntas.length} preguntas · {opcion.contenido.tarjetas.length} tarjetas · {minutos(resumen.porCurso.get(opcion.id) ?? 0)} estudiados</small></span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </>
        ) : modo === "inicio" ? (
          <Modos
            contenido={elegida.contenido}
            cursoId={elegida.id}
            rango={rango}
            resumen={resumen}
            resumenHoy={resumenHoy}
            onRango={setRango}
            onQuiz={() => onQuiz(elegida.id, { ...QUIZ_PUERTA, rango })}
            onSimulacro={() => onQuiz(elegida.id, { ...SIMULACRO_PRACTICA, rango })}
            onTarjetas={() => setModo("tarjetas")}
            onConceptos={() => setModo("conceptos")}
          />
        ) : modo === "tarjetas" ? (
          <Tarjetas
            contenido={elegida.contenido}
            cursoId={elegida.id}
            indice={tarjeta}
            girada={girada}
            onGirar={() => setGirada((valor) => !valor)}
            onCambiar={(siguiente) => { setTarjeta(siguiente); setGirada(false); }}
          />
        ) : (
          <Conceptos contenido={elegida.contenido} cursoId={elegida.id} />
        )}
      </main>
    </div>
  );
}

function Modos({ contenido, cursoId, rango, resumen, resumenHoy, onRango, onQuiz, onSimulacro, onTarjetas, onConceptos }: { contenido: ContenidoCurso; cursoId: number; rango?: RangoPeriodoEstudio; resumen: ResumenEstudio; resumenHoy: ResumenEstudio; onRango: (rango: RangoPeriodoEstudio) => void; onQuiz: () => void; onSimulacro: () => void; onTarjetas: () => void; onConceptos: () => void }) {
  const tipo = tipoPeriodoCurso(contenido.nombre);
  const periodos = periodosDisponibles(contenido.preguntas, tipo);
  const actividadHoy = resumenHoy.porCursoActividad.get(cursoId) ?? { cuestionario: 0, flashcards: 0, lectura: 0 };
  const opciones = [
    { icono: BookOpen, titulo: "Cuestionario", texto: "12 preguntas · necesitas 10 correctas para aprobar.", accion: onQuiz },
    { icono: ClipboardCheck, titulo: "Simulacro de práctica", texto: "30 preguntas · 0.5 puntos por respuesta correcta.", accion: onSimulacro },
    { icono: Layers, titulo: "Flashcards", texto: `${contenido.tarjetas.length} tarjetas para recuperar conceptos de memoria.`, accion: onTarjetas },
    { icono: FileText, titulo: "Lectura activa", texto: `${contenido.conceptos.length} síntesis breves para leer y luego explicarte el tema.`, accion: onConceptos },
  ];
  return (
    <>
      <p className="qz-intro">Escoge cómo quieres repasar. Puedes alternar entre recordar, responder y leer antes de volver al cuestionario.</p>
      <section className="card" style={{ padding: "13px 14px", marginBottom: 14 }}>
        <span className="eyebrow">Tu estudio en este curso</span>
        <p style={{ margin: "5px 0", fontSize: 15 }}>{minutos(resumenHoy.porCurso.get(cursoId) ?? 0)} hoy · {minutos(resumen.porCurso.get(cursoId) ?? 0)} acumulados</p>
        <small style={{ color: "var(--ink2)" }}>Cuestionarios {minutos(actividadHoy.cuestionario)} · tarjetas {minutos(actividadHoy.flashcards)} · lectura {minutos(actividadHoy.lectura)} hoy</small>
      </section>
      {rango && periodos.length > 0 && (
        <section className="qz-rango" aria-label="Contenido incluido en el cuestionario">
          <span className="eyebrow">Contenido del cuestionario</span>
          <p>Incluye solo {tipo === "semana" ? "las semanas" : "las unidades"} que selecciones.</p>
          <div>
            <label>Desde
              <select value={rango.desde} onChange={(e) => onRango({ ...rango, desde: Math.min(Number(e.target.value), rango.hasta) })}>
                {periodos.map((numero) => <option key={numero} value={numero}>{tipo === "semana" ? "Semana" : "Unidad"} {numero}</option>)}
              </select>
            </label>
            <label>Hasta
              <select value={rango.hasta} onChange={(e) => onRango({ ...rango, hasta: Math.max(Number(e.target.value), rango.desde) })}>
                {periodos.map((numero) => <option key={numero} value={numero}>{tipo === "semana" ? "Semana" : "Unidad"} {numero}</option>)}
              </select>
            </label>
          </div>
        </section>
      )}
      <div className="qz-cursos">
        {opciones.map(({ icono: Icono, titulo, texto, accion }) => (
          <button key={titulo} className="qz-curso" onClick={accion}>
            <span className="qz-curso-icono"><Icono size={20} /></span>
            <span className="qz-curso-info"><strong>{titulo}</strong><small>{texto}</small></span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      <p style={{ color: "var(--ink2)", fontSize: 12, lineHeight: 1.5, marginTop: 18 }}>
        Las fuentes aparecen en cada tarjeta y lectura para que puedas volver a la clase correspondiente.
      </p>
    </>
  );
}

function Tarjetas({ contenido, cursoId, indice, girada, onGirar, onCambiar }: { contenido: ContenidoCurso; cursoId: number; indice: number; girada: boolean; onGirar: () => void; onCambiar: (indice: number) => void }) {
  useTiempoEstudio(cursoId, "flashcards");
  const actual = contenido.tarjetas[indice];
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="eyebrow">Tarjeta {indice + 1}/{contenido.tarjetas.length}</span>
        <span className="eyebrow">{actual.tema}</span>
      </div>
      <button className="card btn" onClick={onGirar} style={{ width: "100%", minHeight: 250, padding: 24, textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between", background: girada ? "var(--pino)" : "var(--paper)", color: girada ? "var(--paper)" : "var(--ink)" }}>
        <RotateCcw size={20} color={girada ? "var(--paper)" : "var(--pino)"} />
        <div>
          <span className="eyebrow" style={{ color: girada ? "color-mix(in srgb, var(--paper) 72%, transparent)" : "var(--ink2)" }}>{girada ? "Respuesta" : "Pregunta"}</span>
          <h2 className="disp" style={{ fontSize: 25, lineHeight: 1.18, margin: "8px 0 0" }}>{girada ? actual.reverso : actual.frente}</h2>
        </div>
        <small style={{ color: girada ? "color-mix(in srgb, var(--paper) 76%, transparent)" : "var(--ink2)", lineHeight: 1.4 }}>{girada ? actual.fuente : "Toca para revelar"}</small>
      </button>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="qz-btn-secundario" disabled={indice === 0} onClick={() => onCambiar(indice - 1)} style={{ flex: 1, justifyContent: "center" }}><ChevronLeft size={18} />Anterior</button>
        <button className="qz-btn-primario" disabled={indice === contenido.tarjetas.length - 1} onClick={() => onCambiar(indice + 1)} style={{ flex: 1, justifyContent: "center" }}>Siguiente<ChevronRight size={18} /></button>
      </div>
    </section>
  );
}

function Conceptos({ contenido, cursoId }: { contenido: ContenidoCurso; cursoId: number }) {
  useTiempoEstudio(cursoId, "lectura");
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <p className="qz-intro" style={{ margin: 0 }}>Lee una idea, tapa el texto y trata de explicarla con tus propias palabras antes de avanzar.</p>
      {contenido.conceptos.map((concepto) => (
        <article key={concepto.titulo} className="card" style={{ padding: "16px 15px" }}>
          <span className="eyebrow">{concepto.tema}</span>
          <h2 className="disp" style={{ fontSize: 21, margin: "5px 0 9px" }}>{concepto.titulo}</h2>
          <p style={{ color: "var(--ink2)", fontSize: 13.5, lineHeight: 1.62, margin: 0 }}>{concepto.explicacion}</p>
          <p className="eyebrow" style={{ margin: "12px 0 0", fontSize: 9 }}>{concepto.fuente}</p>
        </article>
      ))}
    </section>
  );
}

function minutos(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60_000));
  return total >= 60 ? `${Math.floor(total / 60)} h ${total % 60} min` : `${total} min`;
}

/** Cuenta únicamente mientras la aplicación está en primer plano. */
function useTiempoEstudio(cursoId: number, tipoActividad: TipoActividadEstudio) {
  const registro = useRef({ activo: false, inicio: 0, acumulado: 0 });
  useEffect(() => {
    const estado = registro.current;
    const iniciar = () => {
      if (!estado.activo) { estado.activo = true; estado.inicio = Date.now(); }
    };
    const detener = () => {
      if (estado.activo) { estado.acumulado += Date.now() - estado.inicio; estado.activo = false; }
    };
    const alCambiarVisibilidad = () => document.visibilityState === "visible" ? iniciar() : detener();
    if (document.visibilityState === "visible") iniciar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      detener();
      void registrarTiempoEstudio({ cursoId, tipoActividad, duracionMs: estado.acumulado });
      registro.current = { activo: false, inicio: 0, acumulado: 0 };
    };
  }, [cursoId, tipoActividad]);
}
