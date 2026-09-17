import { useState, useCallback, useEffect, useRef } from "react";
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
import type { EstadoQuiz } from "../estudio/tipos";
import type { Curso } from "../db/db";

const PREGUNTAS_NECESARIAS = 12;
const UMBRAL_APROBACION = 10;
const MINUTOS_DESBLOQUEADOS = 15;

export function Quiz({ onBack, paqueteDestino }: { onBack: () => void; paqueteDestino?: string }) {
  const [quiz, setQuiz] = useState<EstadoQuiz | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cursos = useLiveQuery(cursosActivos, [], []);
  const totalPreguntas = useLiveQuery(contarPreguntas, [], 0);

  const empezar = useCallback(async (cursoId: number | null) => {
    setCargando(true);
    setError("");
    try {
      const q = await iniciarQuiz(PREGUNTAS_NECESARIAS, cursoId);
      if (!q) {
        setError("No hay preguntas disponibles para este curso.");
        return;
      }
      setQuiz(q);
    } catch {
      setError("No se pudieron cargar las preguntas.");
    } finally {
      setCargando(false);
    }
  }, []);

  if (!quiz || quiz.fase === "selector") {
    return (
      <Selector
        cursos={cursos}
        totalPreguntas={totalPreguntas}
        cargando={cargando}
        error={error}
        onEmpezar={empezar}
        onBack={onBack}
        paqueteDestino={paqueteDestino}
      />
    );
  }

  if (quiz.fase === "resultado") {
    return (
      <Resultado
        quiz={quiz}
        onReintentar={() => setQuiz(null)}
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
}: {
  cursos: Curso[];
  totalPreguntas: number;
  cargando: boolean;
  error: string;
  onEmpezar: (cursoId: number | null) => void;
  onBack: () => void;
  paqueteDestino?: string;
}) {
  const [conteos, setConteos] = useState<Map<number, number>>(new Map());

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

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="eyebrow">Puerta de estudio</span>
          <h1 className="disp" style={{ fontSize: 22 }}>Elige un curso</h1>
        </div>
      </header>

      <div className="qz-body">
        <p className="qz-intro">
          Responde {PREGUNTAS_NECESARIAS} preguntas. Con {UMBRAL_APROBACION} aciertos ganas {MINUTOS_DESBLOQUEADOS} minutos{paqueteDestino ? " para la app que intentaste abrir" : " de repaso"}.
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
              onClick={() => onEmpezar(c.id!)}
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

      <div className="qz-body">
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
          <div className="qz-feedback">
            <p className={esCorrecta ? "qz-feedback-ok" : "qz-feedback-mal"}>
              {esCorrecta ? "Correcto" : "Incorrecto"}
            </p>
            {p.explicacion && <p className="qz-explicacion">{p.explicacion}</p>}
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
  onReintentar,
  onSalir,
  paqueteDestino,
}: {
  quiz: EstadoQuiz;
  onReintentar: () => void;
  onSalir: () => void;
  paqueteDestino?: string;
}) {
  const paso = aprobo(quiz, UMBRAL_APROBACION);
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

  return (
    <div className="qz">
      <header className="qz-header">
        <button className="btn" onClick={onSalir} aria-label="Salir">
          <X size={20} />
        </button>
        <div>
          <span className="eyebrow">Resultado</span>
          <h1 className="disp" style={{ fontSize: 22 }}>
            {paso ? "Aprobado" : "No aprobado"}
          </h1>
        </div>
      </header>

      <div className="qz-body qz-resultado">
        <div className="qz-score">
          <span className="qz-score-num">{quiz.correctas}/{quiz.preguntas.length}</span>
          <span className="qz-score-pct">{porcentaje}%</span>
        </div>

        {paso && paqueteDestino ? (
          <div className="qz-desbloqueado">
            <Unlock size={24} />
            <p>
              {!guardado || credito === "pendiente"
                ? "Registrando desbloqueo…"
                : credito === "concedido"
                ? `${MINUTOS_DESBLOQUEADOS} minutos desbloqueados`
                : "El límite diario ya está usado o esta app no está habilitada."}
            </p>
          </div>
        ) : paso ? (
          <p className="qz-no-paso">Repaso registrado. Abre el quiz desde una app bloqueada para ganar acceso.</p>
        ) : (
          <p className="qz-no-paso">
            Necesitas al menos {UMBRAL_APROBACION} respuestas correctas.
          </p>
        )}

        <div className="qz-resultado-acciones">
          {!paso && (
            <button className="qz-btn-primario" onClick={onReintentar}>
              <RefreshCw size={18} />
              Intentar de nuevo
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
