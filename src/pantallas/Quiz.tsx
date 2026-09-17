import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  GraduationCap,
  RefreshCw,
  Unlock,
  X,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { cursosActivos } from "../db/cursos";
import { contarPreguntas, preguntasDeCurso } from "../estudio/preguntas";
import { iniciarQuiz, responder, siguiente, aprobo, finalizarQuiz } from "../estudio/quiz";
import { sembrarPreguntas } from "../estudio/semilla";
import type { EstadoQuiz } from "../estudio/tipos";
import type { Curso } from "../db/db";
import { QUIZ_PUERTA, type ConfiguracionQuiz } from "../estudio/configuracionQuiz";
import { periodosDisponibles, tipoPeriodoCurso, type RangoPeriodoEstudio } from "../estudio/periodos";

const MINUTOS_DESBLOQUEADOS = 15;

export function Quiz({
  onBack,
  paqueteDestino,
  cursoIdInicial,
  configuracion = QUIZ_PUERTA,
}: {
  onBack: () => void;
  paqueteDestino?: string;
  cursoIdInicial?: number | null;
  configuracion?: ConfiguracionQuiz;
}) {
  const [quiz, setQuiz] = useState<EstadoQuiz | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cursos = useLiveQuery(cursosActivos, [], []);
  const totalPreguntas = useLiveQuery(contarPreguntas, [], 0);

  useEffect(() => { void sembrarPreguntas().catch(() => setError("No se pudieron preparar las preguntas.")); }, []);

  const empezar = useCallback(async (cursoId: number | null, rango?: RangoPeriodoEstudio) => {
    setCargando(true);
    setError("");
    try {
      // El curso puede abrirse antes de que el efecto inicial termine de
      // sembrar IndexedDB; esta operación es idempotente y evita un quiz vacío.
      await sembrarPreguntas();
      const q = await iniciarQuiz(configuracion.cantidad, cursoId, rango ?? configuracion.rango);
      if (!q || q.preguntas.length < configuracion.cantidad) {
        setError(`No hay ${configuracion.cantidad} preguntas disponibles para este rango.`);
        return;
      }
      setQuiz(q);
    } catch {
      setError("No se pudieron cargar las preguntas.");
    } finally {
      setCargando(false);
    }
  }, [configuracion.cantidad, configuracion.rango]);

  // Si viene de Estudio con un curso elegido, arrancar directo.
  const autoIniciado = useRef(false);
  useEffect(() => {
    if (cursoIdInicial != null && !autoIniciado.current && !quiz) {
      autoIniciado.current = true;
      void empezar(cursoIdInicial);
    }
  }, [cursoIdInicial, empezar, quiz]);

  if (!quiz || quiz.fase === "selector") {
    // Al venir desde la ficha de un curso no debe existir una segunda elección,
    // ni siquiera durante el primer render mientras se consulta IndexedDB.
    if (cursoIdInicial != null) {
      return (
        <div className="qz" style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "var(--ink2)", fontSize: 14 }}>
            {error || (cargando ? "Preparando preguntas..." : "Abriendo cuestionario...")}
          </p>
        </div>
      );
    }
    return (
      <Selector
        cursos={cursos}
        totalPreguntas={totalPreguntas}
        cargando={cargando}
        error={error}
        onEmpezar={empezar}
        onBack={onBack}
        paqueteDestino={paqueteDestino}
        configuracion={configuracion}
      />
    );
  }

  if (quiz.fase === "resultado") {
    return (
      <Resultado
        quiz={quiz}
        configuracion={configuracion}
        onReintentar={() => {
          if (cursoIdInicial != null) {
            setQuiz(null);
            autoIniciado.current = false;
            void empezar(cursoIdInicial);
          } else {
            setQuiz(null);
          }
        }}
        onSalir={onBack}
        paqueteDestino={paqueteDestino}
      />
    );
  }

  return (
    <Pregunta
      quiz={quiz}
      onResponder={(opcion) => setQuiz(responder(quiz, opcion))}
      onSiguiente={() => setQuiz(siguiente(quiz))}
      onSalir={onBack}
    />
  );
}

/* ── Selector de curso ──────────────────────────────────────────────── */

function Selector({
  cursos,
  totalPreguntas,
  cargando,
  error,
  onEmpezar,
  onBack,
  paqueteDestino,
  configuracion,
}: {
  cursos: Curso[];
  totalPreguntas: number;
  cargando: boolean;
  error: string;
  onEmpezar: (cursoId: number | null, rango?: RangoPeriodoEstudio) => void;
  onBack: () => void;
  paqueteDestino?: string;
  configuracion: ConfiguracionQuiz;
}) {
  const [conteos, setConteos] = useState<Map<number, number>>(new Map());
  const [cursoParaFiltrar, setCursoParaFiltrar] = useState<Curso | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const mapa = new Map<number, number>();
      for (const c of cursos) {
        if (c.id != null) {
          const ps = await preguntasDeCurso(c.id);
          mapa.set(c.id, ps.length);
        }
      }
      if (!cancelado) setConteos(mapa);
    }
    if (cursos.length > 0) void cargar();
    return () => { cancelado = true; };
  }, [cursos]);

  if (cursoParaFiltrar) {
    return <SelectorRango curso={cursoParaFiltrar} configuracion={configuracion} onBack={() => setCursoParaFiltrar(null)} onEmpezar={onEmpezar} />;
  }

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="eyebrow">{configuracion.tipo === "puerta" ? "Puerta de estudio" : "Simulacro de práctica"}</span>
          <h1 className="disp" style={{ fontSize: 22 }}>Elige un curso</h1>
        </div>
      </header>

      <div className="qz-body">
        <p className="qz-intro">
          {configuracion.tipo === "puerta"
            ? <>Responde {configuracion.cantidad} preguntas. Con {configuracion.umbral} aciertos ganas {MINUTOS_DESBLOQUEADOS} minutos{paqueteDestino ? " para la app que intentaste abrir" : " de repaso"}.</>
            : <>Responde {configuracion.cantidad} preguntas. Cada respuesta correcta vale {configuracion.puntosPorRespuesta} puntos.</>}
        </p>

        <div className="qz-cursos">
          <button
            className="qz-curso"
            disabled={cargando || totalPreguntas === 0}
            onClick={() => onEmpezar(null)}
          >
            <span className="qz-curso-icono"><BookOpen size={20} /></span>
            <span className="qz-curso-info">
              <strong>Todos los cursos</strong>
              <small>{totalPreguntas} preguntas</small>
            </span>
            <ChevronRight size={18} />
          </button>

          {cursos.map((c) => (
            <button
              key={c.id}
              className="qz-curso"
              disabled={cargando || (conteos.get(c.id!) ?? 0) === 0}
              onClick={() => setCursoParaFiltrar(c)}
            >
              <span className="qz-curso-icono"><GraduationCap size={20} /></span>
              <span className="qz-curso-info">
                <strong>{c.nombre}</strong>
                <small>{conteos.get(c.id!) ?? 0} preguntas</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>

        {error && <p className="qz-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

function SelectorRango({
  curso,
  configuracion,
  onBack,
  onEmpezar,
}: {
  curso: Curso;
  configuracion: ConfiguracionQuiz;
  onBack: () => void;
  onEmpezar: (cursoId: number, rango: RangoPeriodoEstudio) => void;
}) {
  const preguntas = useLiveQuery(() => preguntasDeCurso(curso.id!), [curso.id], []);
  const tipo = tipoPeriodoCurso(curso.nombre);
  const periodos = periodosDisponibles(preguntas, tipo);
  const [desde, setDesde] = useState<number | null>(null);
  const [hasta, setHasta] = useState<number | null>(null);

  useEffect(() => {
    if (periodos.length > 0) {
      setDesde(periodos[0]);
      setHasta(periodos[periodos.length - 1]);
    }
  }, [curso.id, periodos.join(",")]);

  const nombrePeriodo = tipo === "semana" ? "Semana" : "Unidad";
  const incluidas = preguntas.filter((pregunta) => {
    const numero = periodosDisponibles([pregunta], tipo)[0];
    return numero != null && desde != null && hasta != null && numero >= desde && numero <= hasta;
  }).length;

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button>
        <div>
          <span className="eyebrow">{configuracion.tipo === "puerta" ? "Puerta de estudio" : "Simulacro de práctica"}</span>
          <h1 className="disp" style={{ fontSize: 22 }}>Elige el contenido</h1>
        </div>
      </header>
      <div className="qz-body">
        <p className="qz-intro">{curso.nombre}. Incluye solo el contenido que ya entra en tu evaluación.</p>
        {periodos.length > 0 && desde != null && hasta != null ? (
          <section className="qz-rango">
            <span className="eyebrow">Rango del cuestionario</span>
            <p>{incluidas} preguntas disponibles entre los límites elegidos.</p>
            <div>
              <label>Desde
                <select value={desde} onChange={(e) => setDesde(Math.min(Number(e.target.value), hasta))}>
                  {periodos.map((numero) => <option key={numero} value={numero}>{nombrePeriodo} {numero}</option>)}
                </select>
              </label>
              <label>Hasta
                <select value={hasta} onChange={(e) => setHasta(Math.max(Number(e.target.value), desde))}>
                  {periodos.map((numero) => <option key={numero} value={numero}>{nombrePeriodo} {numero}</option>)}
                </select>
              </label>
            </div>
          </section>
        ) : <p className="qz-error">Aún no hay preguntas clasificadas por {tipo} para este curso.</p>}
        <button
          className="qz-btn-primario"
          disabled={desde == null || hasta == null || incluidas < configuracion.cantidad}
          onClick={() => onEmpezar(curso.id!, { tipo, desde: desde!, hasta: hasta! })}
        >
          Empezar con este rango <ChevronRight size={18} />
        </button>
        {incluidas > 0 && incluidas < configuracion.cantidad && (
          <p className="qz-error">Este formato requiere {configuracion.cantidad} preguntas; amplía el rango para continuar.</p>
        )}
      </div>
    </div>
  );
}

/* ── Pregunta + Feedback ────────────────────────────────────────────── */

function Pregunta({
  quiz,
  onResponder,
  onSiguiente,
  onSalir,
}: {
  quiz: EstadoQuiz;
  onResponder: (opcion: number) => void;
  onSiguiente: () => void;
  onSalir: () => void;
}) {
  const p = quiz.preguntas[quiz.indice];
  const enFeedback = quiz.fase === "feedback";
  const respuestaUsuario = quiz.respuestas[quiz.indice];
  const esCorrecta = respuestaUsuario === p.respuestaCorrecta;
  const definicionYaVisible = p.pregunta.startsWith("¿Qué describe ");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (enFeedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [enFeedback]);

  // El feedback puede llevar la vista hacia abajo. Cada pregunta siguiente
  // siempre empieza desde su enunciado, sin obligar a retroceder manualmente.
  useLayoutEffect(() => {
    if (!enFeedback) cuerpoRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [quiz.indice, enFeedback]);

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={onSalir} aria-label="Salir">
          <X size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <span className="eyebrow">{p.tema}</span>
          <div className="qz-progreso">
            <div
              className="qz-progreso-barra"
              style={{ width: `${((quiz.indice + (enFeedback ? 1 : 0)) / quiz.preguntas.length) * 100}%` }}
            />
          </div>
        </div>
        <span className="eyebrow">
          {quiz.indice + 1}/{quiz.preguntas.length}
        </span>
      </header>

      <div className="qz-body" ref={cuerpoRef}>
        <h2 className="qz-pregunta">{p.pregunta}</h2>

        <div className="qz-opciones">
          {p.opciones.map((opcion, i) => {
            let estado = "";
            if (enFeedback) {
              if (i === p.respuestaCorrecta) estado = "qz-correcta";
              else if (i === respuestaUsuario) estado = "qz-incorrecta";
            }
            return (
              <button
                key={i}
                className={`qz-opcion ${estado}`}
                disabled={enFeedback}
                onClick={() => onResponder(i)}
              >
                <span className="qz-opcion-letra">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opcion}</span>
              </button>
            );
          })}
        </div>

        {enFeedback && (
          <div className="qz-feedback" ref={feedbackRef}>
            <p className={esCorrecta ? "qz-feedback-ok" : "qz-feedback-mal"}>
              {esCorrecta ? "Correcto" : "Incorrecto"}
            </p>
            {!definicionYaVisible && p.explicacion && <p className="qz-explicacion">{p.explicacion}</p>}
            <button className="qz-btn-siguiente" onClick={onSiguiente}>
              {quiz.indice + 1 < quiz.preguntas.length ? "Siguiente" : "Ver resultado"}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Resultado ──────────────────────────────────────────────────────── */

function Resultado({
  quiz,
  configuracion,
  onReintentar,
  onSalir,
  paqueteDestino,
}: {
  quiz: EstadoQuiz;
  configuracion: ConfiguracionQuiz;
  onReintentar: () => void;
  onSalir: () => void;
  paqueteDestino?: string;
}) {
  const esPuerta = configuracion.tipo === "puerta";
  const paso = esPuerta && aprobo(quiz, configuracion.umbral ?? 10);
  const [guardado, setGuardado] = useState(false);
  const [credito, setCredito] = useState<"pendiente" | "concedido" | "denegado" | "sin_destino">("pendiente");
  const terminado = useRef(false);

  useEffect(() => {
    let cancelado = false;
    async function guardar() {
      if (terminado.current) return;
      terminado.current = true;
      const resultado = await finalizarQuiz(quiz, paso ? paqueteDestino : undefined);
      if (!cancelado) {
        setGuardado(true);
        setCredito(!paso ? "sin_destino" : !paqueteDestino ? "sin_destino" : resultado?.concedido ? "concedido" : "denegado");
      }
    }
    void guardar();
    return () => { cancelado = true; };
  }, [quiz, paso, paqueteDestino]);

  const porcentaje = Math.round((quiz.correctas / quiz.preguntas.length) * 100);
  const puntaje = quiz.correctas * (configuracion.puntosPorRespuesta ?? 0);
  const puntajeMaximo = quiz.preguntas.length * (configuracion.puntosPorRespuesta ?? 0);

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={onSalir} aria-label="Salir">
          <X size={20} />
        </button>
        <div>
          <span className="eyebrow">Resultado</span>
          <h1 className="disp" style={{ fontSize: 22 }}>
            {!esPuerta ? "Simulacro terminado" : paso ? "Aprobado" : "No aprobado"}
          </h1>
        </div>
      </header>

      <div className="qz-body qz-resultado">
        <div className="qz-score">
          <span className="qz-score-num">{quiz.correctas}/{quiz.preguntas.length}</span>
          <span className="qz-score-pct">
            {esPuerta ? `${porcentaje}%` : `${puntaje.toFixed(1)} / ${puntajeMaximo.toFixed(1)} puntos · ${porcentaje}%`}
          </span>
        </div>

        {!esPuerta ? (
          <p className="qz-no-paso">Revisa las explicaciones y vuelve a intentarlo con otro grupo de preguntas.</p>
        ) : paso && paqueteDestino ? (
          <div className="qz-desbloqueado">
            <Unlock size={24} />
            <p>
              {!guardado || credito === "pendiente"
                ? "Registrando desbloqueo…"
                : credito === "concedido"
                ? `${MINUTOS_DESBLOQUEADOS} minutos desbloqueados`
                : "No se pudo registrar el acceso para esta app."}
            </p>
          </div>
        ) : paso ? (
          <p className="qz-no-paso">Repaso registrado. Abre el quiz desde una app bloqueada para ganar acceso.</p>
        ) : (
          <p className="qz-no-paso">
            Necesitas al menos {configuracion.umbral} respuestas correctas.
          </p>
        )}

        <div className="qz-resultado-acciones">
          {(!esPuerta || !paso) && (
            <button className="qz-btn-primario" onClick={onReintentar}>
              <RefreshCw size={18} />
              {!esPuerta ? "Nuevo simulacro" : "Intentar de nuevo"}
            </button>
          )}
          <button className="qz-btn-secundario" onClick={onSalir}>
            {paso ? "Volver" : "Salir"}
          </button>
        </div>
      </div>
    </div>
  );
}
