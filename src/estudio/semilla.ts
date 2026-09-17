import { cursosActivos } from "../db/cursos";
import { db } from "../db/db";
import { preguntasDeCurso, agregarPreguntas } from "./preguntas";
import type { PreguntaCurso } from "./tipos";
import { CONTENIDO_CICLO6, contenidoParaCurso, type ContenidoCurso } from "./contenidoCiclo6";

type PreguntaSin = Omit<PreguntaCurso, "id" | "cursoId" | "vecesVista" | "vecesCorrecta">;

/* ── Arquitectura de Negocio ────────────────────────────────────────── */

const ARQ_NEGOCIO: PreguntaSin[] = [
  {
    tema: "Arquitectura empresarial",
    pregunta: "¿Qué framework de arquitectura empresarial es el más utilizado a nivel mundial?",
    opciones: ["TOGAF", "Zachman", "FEAF", "DODAF"],
    respuestaCorrecta: 0,
    explicacion: "TOGAF (The Open Group Architecture Framework) es el estándar más adoptado globalmente.",
  },
  {
    tema: "Arquitectura empresarial",
    pregunta: "¿Cuáles son las cuatro capas del ADM de TOGAF?",
    opciones: [
      "Negocio, Datos, Aplicación, Tecnología",
      "Estrategia, Táctica, Operación, Soporte",
      "Planificación, Diseño, Implementación, Monitoreo",
      "Entrada, Proceso, Salida, Retroalimentación",
    ],
    respuestaCorrecta: 0,
    explicacion: "TOGAF organiza la arquitectura en las capas de Negocio, Datos, Aplicación y Tecnología.",
  },
  {
    tema: "ArchiMate",
    pregunta: "¿Qué es ArchiMate?",
    opciones: [
      "Un lenguaje de modelado para arquitectura empresarial",
      "Un framework de gestión de proyectos",
      "Un lenguaje de programación",
      "Una base de datos relacional",
    ],
    respuestaCorrecta: 0,
    explicacion: "ArchiMate es un estándar de The Open Group para describir arquitecturas empresariales visualmente.",
  },
  {
    tema: "Capacidades de negocio",
    pregunta: "¿Qué describe una capacidad de negocio?",
    opciones: [
      "Lo que una organización puede hacer, independientemente de cómo lo hace",
      "El organigrama de la empresa",
      "Los ingresos anuales por departamento",
      "El software que usa cada área",
    ],
    respuestaCorrecta: 0,
    explicacion: "Una capacidad de negocio define el 'qué', no el 'cómo'. Es estable en el tiempo.",
  },
  {
    tema: "Modelado de procesos",
    pregunta: "¿Qué notación es estándar para modelar procesos de negocio?",
    opciones: ["BPMN", "UML", "ERD", "DFD"],
    respuestaCorrecta: 0,
    explicacion: "BPMN (Business Process Model and Notation) es el estándar ISO para procesos de negocio.",
  },
  {
    tema: "Arquitectura empresarial",
    pregunta: "¿Qué fase del ADM de TOGAF define la visión de la arquitectura?",
    opciones: ["Fase A", "Fase B", "Fase C", "Fase preliminar"],
    respuestaCorrecta: 0,
    explicacion: "La Fase A (Architecture Vision) establece el alcance y la visión del proyecto.",
  },
  {
    tema: "Cadena de valor",
    pregunta: "¿Quién propuso el modelo de cadena de valor?",
    opciones: ["Michael Porter", "Peter Drucker", "Henry Mintzberg", "Philip Kotler"],
    respuestaCorrecta: 0,
    explicacion: "Michael Porter introdujo la cadena de valor en 1985 para analizar la ventaja competitiva.",
  },
  {
    tema: "Arquitectura empresarial",
    pregunta: "¿Qué es el repositorio de arquitectura en TOGAF?",
    opciones: [
      "Un almacén de artefactos, modelos y estándares de la arquitectura",
      "Una base de datos de clientes",
      "El código fuente de la organización",
      "Un servidor de archivos compartido",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Gobierno de arquitectura",
    pregunta: "¿Para qué sirve el gobierno de arquitectura empresarial?",
    opciones: [
      "Asegurar que los proyectos sigan los estándares y la visión de la arquitectura",
      "Controlar los gastos de TI",
      "Gestionar el personal del área de sistemas",
      "Programar las aplicaciones de la empresa",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Zachman",
    pregunta: "¿En qué se diferencia el framework de Zachman de TOGAF?",
    opciones: [
      "Zachman es una taxonomía de clasificación, TOGAF es un método de desarrollo",
      "Zachman solo aplica a software, TOGAF a hardware",
      "Zachman es más reciente que TOGAF",
      "No hay diferencia, son lo mismo",
    ],
    respuestaCorrecta: 0,
    explicacion: "Zachman organiza artefactos en una matriz (qué, cómo, dónde, quién, cuándo, por qué). TOGAF es un proceso iterativo (ADM).",
  },
  {
    tema: "Modelo de negocio",
    pregunta: "¿Cuántos bloques tiene el Business Model Canvas?",
    opciones: ["9", "5", "7", "12"],
    respuestaCorrecta: 0,
    explicacion: "El Canvas de Osterwalder tiene 9 bloques: propuesta de valor, segmentos, canales, relaciones, ingresos, recursos, actividades, socios y costos.",
  },
  {
    tema: "ArchiMate",
    pregunta: "¿Cuáles son las tres capas principales de ArchiMate?",
    opciones: [
      "Negocio, Aplicación, Tecnología",
      "Estratégica, Táctica, Operativa",
      "Frontend, Backend, Base de datos",
      "Diseño, Desarrollo, Despliegue",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Transformación digital",
    pregunta: "¿Qué diferencia hay entre digitalización y transformación digital?",
    opciones: [
      "La digitalización convierte procesos a digital; la transformación cambia el modelo de negocio",
      "Son sinónimos",
      "La transformación digital solo aplica a startups",
      "La digitalización es más costosa que la transformación digital",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Arquitectura empresarial",
    pregunta: "¿Qué significa ADM en TOGAF?",
    opciones: [
      "Architecture Development Method",
      "Application Design Model",
      "Advanced Data Management",
      "Automated Deployment Module",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Stakeholders",
    pregunta: "¿Por qué es importante identificar stakeholders en la arquitectura empresarial?",
    opciones: [
      "Porque cada stakeholder tiene preocupaciones diferentes que la arquitectura debe abordar",
      "Porque los stakeholders pagan la licencia de TOGAF",
      "Solo es una formalidad del proceso",
      "Para saber quién programa cada módulo",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Arquitectura de referencia",
    pregunta: "¿Qué es una arquitectura de referencia?",
    opciones: [
      "Un modelo genérico reutilizable que sirve de plantilla para arquitecturas específicas",
      "La arquitectura actual de la empresa",
      "Un diagrama de la red de la empresa",
      "El manual de usuario del ERP",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "TOGAF",
    pregunta: "¿Qué fase del ADM se encarga de la arquitectura de sistemas de información?",
    opciones: ["Fase C", "Fase A", "Fase D", "Fase E"],
    respuestaCorrecta: 0,
    explicacion: "La Fase C cubre las arquitecturas de Datos y Aplicación.",
  },
  {
    tema: "Modelo de negocio",
    pregunta: "¿Qué bloque del Business Model Canvas describe cómo la empresa genera dinero?",
    opciones: ["Fuentes de ingresos", "Propuesta de valor", "Canales", "Socios clave"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Alineamiento",
    pregunta: "¿Qué se busca al alinear TI con el negocio?",
    opciones: [
      "Que la tecnología apoye directamente los objetivos estratégicos de la organización",
      "Que todos los empleados usen el mismo computador",
      "Que el área de TI tenga más presupuesto",
      "Que se elimine el departamento de sistemas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Arquitectura empresarial",
    pregunta: "¿Qué es un building block en TOGAF?",
    opciones: [
      "Un componente reutilizable de funcionalidad definida que puede combinarse con otros",
      "Un bloque de código fuente",
      "Un servidor físico en el data center",
      "Un formulario del ERP",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "TOGAF",
    pregunta: "¿Qué documento se produce al final de la Fase A del ADM?",
    opciones: [
      "Statement of Architecture Work",
      "Architecture Definition Document",
      "Architecture Requirements Specification",
      "Implementation and Migration Plan",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Modelo de madurez",
    pregunta: "¿Qué evalúa un modelo de madurez de arquitectura empresarial?",
    opciones: [
      "El nivel de adopción y efectividad de las prácticas de AE en la organización",
      "La edad del hardware",
      "El número de empleados de TI",
      "La cantidad de servidores",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Principios de arquitectura",
    pregunta: "¿Para qué sirven los principios de arquitectura?",
    opciones: [
      "Guían la toma de decisiones de diseño y selección de tecnología",
      "Definen el salario de los arquitectos",
      "Son las reglas del lenguaje de programación",
      "Indican qué proveedor de nube usar",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Gap analysis",
    pregunta: "¿Qué es un gap analysis en arquitectura empresarial?",
    opciones: [
      "La comparación entre el estado actual y el estado deseado para identificar brechas",
      "Un análisis de los competidores",
      "Una auditoría financiera",
      "Un test de rendimiento del sistema",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Gestión de requisitos",
    pregunta: "¿En qué fase del ADM se gestiona continuamente los requisitos?",
    opciones: [
      "Requirements Management (centro del ciclo, permanente)",
      "Solo en la Fase A",
      "Solo en la Fase H",
      "No se gestionan requisitos en TOGAF",
    ],
    respuestaCorrecta: 0,
  },
];

/* ── Cálculo II ─────────────────────────────────────────────────────── */

const CALCULO_II: PreguntaSin[] = [
  {
    tema: "Integrales",
    pregunta: "¿Cuál es la integral de 1/x?",
    opciones: ["ln|x| + C", "x² + C", "1/x² + C", "e^x + C"],
    respuestaCorrecta: 0,
    explicacion: "La integral de 1/x es el logaritmo natural del valor absoluto de x.",
  },
  {
    tema: "Integrales",
    pregunta: "¿Qué técnica de integración se usa cuando el integrando es un producto de dos funciones?",
    opciones: ["Integración por partes", "Sustitución", "Fracciones parciales", "Integración directa"],
    respuestaCorrecta: 0,
    explicacion: "Integración por partes aplica la fórmula ∫u dv = uv − ∫v du.",
  },
  {
    tema: "Series",
    pregunta: "¿Qué prueba se usa primero para determinar si una serie converge?",
    opciones: [
      "Prueba de la divergencia (término n-ésimo)",
      "Prueba de la razón",
      "Prueba de la raíz",
      "Criterio de comparación",
    ],
    respuestaCorrecta: 0,
    explicacion: "Si lim(aₙ) ≠ 0, la serie diverge. Si es 0, no se concluye nada y hay que usar otra prueba.",
  },
  {
    tema: "Series de Taylor",
    pregunta: "¿Cuál es la serie de Taylor de e^x centrada en 0?",
    opciones: ["Σ xⁿ/n! para n=0,1,2…", "Σ xⁿ para n=0,1,2…", "Σ (-1)ⁿxⁿ/n!", "Σ nxⁿ"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Convergencia",
    pregunta: "¿Qué dice el criterio de la razón para una serie Σaₙ?",
    opciones: [
      "Si lim|aₙ₊₁/aₙ| < 1, la serie converge absolutamente",
      "Si lim|aₙ₊₁/aₙ| < 1, la serie diverge",
      "Si lim|aₙ₊₁/aₙ| = 1, la serie converge",
      "Solo funciona para series alternadas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Integrales",
    pregunta: "¿Qué es una integral impropia?",
    opciones: [
      "Una integral con al menos un límite infinito o una discontinuidad en el intervalo",
      "Una integral que no tiene solución",
      "Una integral de una función negativa",
      "Una integral con exponentes fraccionarios",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Sustitución trigonométrica",
    pregunta: "Si el integrando contiene √(a²−x²), ¿qué sustitución conviene?",
    opciones: ["x = a·sen(θ)", "x = a·tan(θ)", "x = a·sec(θ)", "x = a·cos(θ)"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Fracciones parciales",
    pregunta: "¿Para qué se usa la descomposición en fracciones parciales?",
    opciones: [
      "Para integrar funciones racionales descomponiéndolas en fracciones más simples",
      "Para derivar funciones racionales",
      "Para sumar fracciones con distinto denominador",
      "Para resolver ecuaciones cuadráticas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Series",
    pregunta: "¿Qué es una serie geométrica?",
    opciones: ["Σ arⁿ donde r es la razón constante", "Σ 1/n", "Σ n!", "Σ (-1)ⁿ/n"],
    respuestaCorrecta: 0,
    explicacion: "Converge si |r| < 1, con suma a/(1−r).",
  },
  {
    tema: "Series alternadas",
    pregunta: "¿Qué condiciones exige el criterio de Leibniz para series alternadas?",
    opciones: [
      "Que los términos sean decrecientes en valor absoluto y tiendan a 0",
      "Que todos los términos sean positivos",
      "Que la razón sea menor que 1",
      "Que los términos crezcan",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Series de potencias",
    pregunta: "¿Qué es el radio de convergencia de una serie de potencias?",
    opciones: [
      "El valor R tal que la serie converge para |x−c| < R y diverge para |x−c| > R",
      "El número de términos de la serie",
      "La distancia entre dos puntos del plano",
      "El exponente más grande de la serie",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Integrales",
    pregunta: "¿Cuál es el teorema fundamental del cálculo?",
    opciones: [
      "Si F es antiderivada de f continua en [a,b], entonces ∫ₐᵇ f(x)dx = F(b)−F(a)",
      "Toda función tiene antiderivada",
      "La derivada de una constante es cero",
      "Las integrales siempre convergen",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Convergencia",
    pregunta: "¿Qué es convergencia absoluta?",
    opciones: [
      "Cuando Σ|aₙ| converge",
      "Cuando Σaₙ converge pero Σ|aₙ| diverge",
      "Cuando la serie tiene todos los términos positivos",
      "Cuando la serie tiene radio de convergencia infinito",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Series de Taylor",
    pregunta: "¿Cuál es la serie de Maclaurin de sen(x)?",
    opciones: [
      "Σ (-1)ⁿ x²ⁿ⁺¹/(2n+1)!",
      "Σ (-1)ⁿ x²ⁿ/(2n)!",
      "Σ xⁿ/n!",
      "Σ (-1)ⁿ xⁿ",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Integrales",
    pregunta: "∫ cos(x) dx = ?",
    opciones: ["sen(x) + C", "−sen(x) + C", "cos(x) + C", "tan(x) + C"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Aplicaciones",
    pregunta: "¿Cómo se calcula el volumen de un sólido de revolución alrededor del eje x?",
    opciones: [
      "V = π ∫ₐᵇ [f(x)]² dx (método de discos)",
      "V = 2π ∫ₐᵇ f(x) dx",
      "V = ∫ₐᵇ f(x) dx",
      "V = f(b) − f(a)",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Series",
    pregunta: "La serie armónica Σ 1/n…",
    opciones: ["Diverge", "Converge a 1", "Converge a π²/6", "Converge a ln(2)"],
    respuestaCorrecta: 0,
    explicacion: "La serie armónica diverge, aunque lentamente. La serie p con p=1 siempre diverge.",
  },
  {
    tema: "Series p",
    pregunta: "¿Para qué valores de p converge la serie Σ 1/nᵖ?",
    opciones: ["p > 1", "p > 0", "p ≥ 1", "p > 2"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Integrales",
    pregunta: "¿Qué es el método de sustitución (cambio de variable)?",
    opciones: [
      "Reemplazar una expresión por una nueva variable para simplificar la integral",
      "Sustituir la integral por una derivada",
      "Reemplazar x por un número fijo",
      "Cambiar los límites de integración por 0 y 1",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Convergencia",
    pregunta: "¿Qué prueba sirve para comparar una serie con otra de convergencia conocida?",
    opciones: ["Prueba de comparación", "Prueba de la divergencia", "Serie de Taylor", "Integración por partes"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Series de potencias",
    pregunta: "¿Cuál es la serie geométrica como serie de potencias?",
    opciones: ["1/(1−x) = Σ xⁿ para |x|<1", "eˣ = Σ xⁿ/n!", "ln(x) = Σ xⁿ/n", "sin(x) = Σ xⁿ"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Integrales",
    pregunta: "¿Cuál es la integral de sec²(x)?",
    opciones: ["tan(x) + C", "sec(x) + C", "−cos(x) + C", "ln|sec(x)| + C"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Aplicaciones",
    pregunta: "¿Cómo se calcula la longitud de arco de y=f(x) en [a,b]?",
    opciones: [
      "L = ∫ₐᵇ √(1 + [f'(x)]²) dx",
      "L = ∫ₐᵇ f(x) dx",
      "L = f(b) − f(a)",
      "L = ∫ₐᵇ |f(x)| dx",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Convergencia",
    pregunta: "¿Qué establece la prueba de la integral para series?",
    opciones: [
      "Si f es positiva, continua y decreciente y ∫₁^∞ f(x)dx converge, entonces Σf(n) converge",
      "Toda serie puede convertirse en integral",
      "Las integrales y las series siempre dan el mismo resultado",
      "Solo aplica a series alternadas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Integrales",
    pregunta: "∫ eˣ dx = ?",
    opciones: ["eˣ + C", "xeˣ + C", "eˣ/x + C", "ln(eˣ) + C"],
    respuestaCorrecta: 0,
  },
];

/* ── Diseño de Experimentos en SI ───────────────────────────────────── */

const DISENO_EXP: PreguntaSin[] = [
  {
    tema: "Conceptos básicos",
    pregunta: "¿Qué es un experimento en el contexto de diseño de experimentos?",
    opciones: [
      "Un procedimiento controlado para determinar el efecto de factores sobre una respuesta",
      "Un ensayo sin controles ni mediciones",
      "Una encuesta de opinión",
      "Un análisis de mercado",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Variables",
    pregunta: "¿Qué es una variable dependiente en un experimento?",
    opciones: [
      "La que se mide como resultado del experimento (respuesta)",
      "La que el investigador manipula",
      "Una variable que no cambia",
      "La variable aleatoria",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Variables",
    pregunta: "¿Qué es un factor en diseño de experimentos?",
    opciones: [
      "Una variable independiente que el investigador manipula deliberadamente",
      "El resultado del experimento",
      "Un error de medición",
      "El tamaño de la muestra",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Niveles",
    pregunta: "¿Qué son los niveles de un factor?",
    opciones: [
      "Los valores específicos que toma el factor en el experimento",
      "Las capas del modelo OSI",
      "Los grados de libertad",
      "Las etapas del ciclo de vida",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Diseño factorial",
    pregunta: "¿Qué es un diseño factorial completo 2ᵏ?",
    opciones: [
      "Un diseño que prueba todas las combinaciones de k factores a 2 niveles cada uno",
      "Un diseño con 2 factores y k niveles",
      "Un diseño que solo prueba los extremos",
      "Un diseño con 2 repeticiones",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Hipótesis",
    pregunta: "¿Qué es la hipótesis nula (H₀)?",
    opciones: [
      "La afirmación de que no hay efecto o diferencia significativa",
      "La hipótesis que siempre se acepta",
      "La hipótesis del investigador",
      "Una hipótesis que nunca se puede rechazar",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "ANOVA",
    pregunta: "¿Para qué se utiliza el análisis de varianza (ANOVA)?",
    opciones: [
      "Para determinar si las medias de varios grupos son significativamente diferentes",
      "Para calcular la mediana",
      "Para hacer regresión lineal",
      "Para estimar la varianza de un solo grupo",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Aleatorización",
    pregunta: "¿Por qué es importante la aleatorización en un experimento?",
    opciones: [
      "Para reducir el sesgo y distribuir uniformemente factores no controlados",
      "Para que el experimento sea más rápido",
      "Para usar menos recursos",
      "Para obtener resultados predeterminados",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Replicación",
    pregunta: "¿Qué es la replicación en diseño de experimentos?",
    opciones: [
      "Repetir el experimento bajo las mismas condiciones para estimar el error experimental",
      "Copiar los resultados de otro estudio",
      "Usar el mismo equipo para dos experimentos",
      "Publicar los resultados dos veces",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Valor p",
    pregunta: "¿Qué indica un valor p < 0.05?",
    opciones: [
      "Que hay evidencia suficiente para rechazar la hipótesis nula al 5% de significancia",
      "Que la hipótesis nula es verdadera",
      "Que el error es del 95%",
      "Que el experimento falló",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Bloqueo",
    pregunta: "¿Qué es un bloque en diseño de experimentos?",
    opciones: [
      "Un grupo de unidades experimentales homogéneas que reduce la variabilidad",
      "Un error en el diseño",
      "Un factor principal",
      "Un nivel del factor",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Interacción",
    pregunta: "¿Qué es una interacción entre factores?",
    opciones: [
      "Cuando el efecto de un factor depende del nivel de otro factor",
      "Cuando dos factores tienen el mismo efecto",
      "Cuando un factor anula al otro",
      "Cuando no hay factores significativos",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Diseño factorial",
    pregunta: "¿Cuántas corridas tiene un diseño factorial 2³?",
    opciones: ["8", "6", "4", "16"],
    respuestaCorrecta: 0,
    explicacion: "2³ = 8 combinaciones posibles.",
  },
  {
    tema: "Error experimental",
    pregunta: "¿Qué es el error experimental?",
    opciones: [
      "La variabilidad en las respuestas que no se puede atribuir a los factores controlados",
      "Un error en el cálculo estadístico",
      "Un defecto del equipo de medición",
      "La diferencia entre la media y la mediana",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Diseño factorial fraccionado",
    pregunta: "¿Cuándo se usa un diseño factorial fraccionado?",
    opciones: [
      "Cuando hay muchos factores y un factorial completo sería demasiado costoso",
      "Cuando solo hay un factor",
      "Cuando se quiere más precisión que un factorial completo",
      "Cuando no hay hipótesis",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Grados de libertad",
    pregunta: "¿Qué son los grados de libertad en ANOVA?",
    opciones: [
      "El número de valores independientes que pueden variar en el cálculo de un estadístico",
      "El número de factores",
      "El número de respuestas",
      "El número de experimentadores",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Superficie de respuesta",
    pregunta: "¿Qué es la metodología de superficie de respuesta (RSM)?",
    opciones: [
      "Una técnica para optimizar una respuesta que depende de varios factores cuantitativos",
      "Un gráfico de barras",
      "Un método para diseñar interfaces de usuario",
      "Un análisis de regresión simple",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Variable de respuesta",
    pregunta: "¿Qué características debe tener una buena variable de respuesta?",
    opciones: [
      "Ser medible, relevante para el objetivo y sensible a los cambios en los factores",
      "Ser siempre cualitativa",
      "No variar nunca",
      "Ser imposible de medir directamente",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Prueba t",
    pregunta: "¿Para qué se usa la prueba t de Student?",
    opciones: [
      "Para comparar las medias de dos grupos y determinar si la diferencia es significativa",
      "Para comparar más de tres grupos",
      "Para calcular la moda",
      "Para graficar datos",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Normalidad",
    pregunta: "¿Por qué se verifica la normalidad de los residuos en ANOVA?",
    opciones: [
      "Porque ANOVA asume que los residuos siguen una distribución normal",
      "Porque los datos siempre son normales",
      "Para hacer el cálculo más fácil",
      "No es necesario verificarla",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Confusión",
    pregunta: "¿Qué es el confounding (confusión) en diseño de experimentos?",
    opciones: [
      "Cuando los efectos de dos o más factores no se pueden separar",
      "Cuando el investigador se confunde",
      "Un error de medición",
      "Cuando la hipótesis nula es falsa",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Cuadrado latino",
    pregunta: "¿Para qué sirve el diseño de cuadrado latino?",
    opciones: [
      "Para controlar dos fuentes de variabilidad (bloques en dos direcciones)",
      "Para diseñar interfaces cuadradas",
      "Para traducir textos al latín",
      "Para analizar datos en tres dimensiones",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Significancia",
    pregunta: "¿Qué significa que un factor sea estadísticamente significativo?",
    opciones: [
      "Que su efecto sobre la respuesta es mayor de lo esperable por azar",
      "Que es el factor más importante del experimento",
      "Que tiene el valor más alto",
      "Que no tiene efecto alguno",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Plackett-Burman",
    pregunta: "¿Cuándo se usa un diseño Plackett-Burman?",
    opciones: [
      "Para tamizar muchos factores rápidamente e identificar los más importantes",
      "Para optimizar una respuesta con pocos factores",
      "Para diseñar bases de datos",
      "Para medir la satisfacción del cliente",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Diseño experimental",
    pregunta: "¿Qué es una unidad experimental?",
    opciones: [
      "La entidad a la que se le aplica un tratamiento y se mide la respuesta",
      "El laboratorio donde se hace el experimento",
      "El investigador principal",
      "El software de análisis estadístico",
    ],
    respuestaCorrecta: 0,
  },
];

/* ── Fundamentos de Sistemas de Información ─────────────────────────── */

const FUNDAMENTOS_SI: PreguntaSin[] = [
  {
    tema: "Componentes de un SI",
    pregunta: "¿Cuáles son los cinco componentes de un sistema de información?",
    opciones: [
      "Hardware, software, datos, personas y procedimientos",
      "Internet, teclado, pantalla, mouse y parlantes",
      "CPU, RAM, disco, GPU y red",
      "Base de datos, servidor, cliente, nube y API",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Tipos de SI",
    pregunta: "¿Qué tipo de sistema de información procesa transacciones rutinarias del día a día?",
    opciones: ["TPS (Transaction Processing System)", "DSS", "EIS", "KMS"],
    respuestaCorrecta: 0,
    explicacion: "El TPS automatiza las operaciones diarias repetitivas como ventas, nómina, inventario.",
  },
  {
    tema: "Tipos de SI",
    pregunta: "¿Para qué sirve un DSS (Decision Support System)?",
    opciones: [
      "Para apoyar la toma de decisiones semiestructuradas y no estructuradas",
      "Para procesar transacciones",
      "Para gestionar el correo electrónico",
      "Para diseñar páginas web",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "ERP",
    pregunta: "¿Qué es un sistema ERP?",
    opciones: [
      "Un sistema integrado que unifica los procesos de negocio de toda la organización",
      "Un editor de texto para empresas",
      "Un sistema operativo empresarial",
      "Un protocolo de red",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "SDLC",
    pregunta: "¿Cuáles son las fases típicas del SDLC (ciclo de vida del desarrollo de sistemas)?",
    opciones: [
      "Planificación, análisis, diseño, implementación, mantenimiento",
      "Comprar, instalar, usar, descartar",
      "Codificar, probar, publicar",
      "Hardware, software, red",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Base de datos",
    pregunta: "¿Qué es una base de datos relacional?",
    opciones: [
      "Un conjunto de datos organizados en tablas relacionadas entre sí mediante claves",
      "Una carpeta con archivos de texto",
      "Un programa de hojas de cálculo",
      "Un sistema de archivos del SO",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "MIS",
    pregunta: "¿Qué tipo de informes genera un MIS (Management Information System)?",
    opciones: [
      "Informes periódicos y resumidos para la gerencia media",
      "Transacciones individuales en tiempo real",
      "Análisis predictivo con IA",
      "Código fuente de los sistemas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Seguridad de la información",
    pregunta: "¿Cuáles son los tres pilares de la seguridad de la información?",
    opciones: [
      "Confidencialidad, integridad y disponibilidad (CIA)",
      "Velocidad, costo y calidad",
      "Hardware, software y red",
      "Firewall, antivirus y backup",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Cloud computing",
    pregunta: "¿Cuáles son los tres modelos de servicio en la nube?",
    opciones: ["IaaS, PaaS, SaaS", "HTTP, FTP, SMTP", "LAN, WAN, MAN", "SQL, NoSQL, NewSQL"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Metodologías ágiles",
    pregunta: "¿Qué metodología ágil organiza el trabajo en sprints de tiempo fijo?",
    opciones: ["Scrum", "Waterfall", "PRINCE2", "Six Sigma"],
    respuestaCorrecta: 0,
  },
  {
    tema: "CRM",
    pregunta: "¿Qué es un CRM?",
    opciones: [
      "Un sistema para gestionar la relación con clientes",
      "Un centro de procesamiento de datos",
      "Un protocolo de comunicación",
      "Un tipo de base de datos",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "BI",
    pregunta: "¿Qué es Business Intelligence (BI)?",
    opciones: [
      "Herramientas y técnicas para transformar datos en información útil para la toma de decisiones",
      "Un tipo de inteligencia artificial",
      "Un lenguaje de programación",
      "El departamento de espionaje corporativo",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Dato vs información",
    pregunta: "¿Cuál es la diferencia entre dato e información?",
    opciones: [
      "El dato es un hecho en bruto; la información es el dato procesado con contexto y significado",
      "Son sinónimos",
      "La información es más pequeña que el dato",
      "El dato siempre es numérico, la información es textual",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "E-commerce",
    pregunta: "¿Qué modelo de e-commerce es cuando una empresa vende directamente al consumidor final?",
    opciones: ["B2C", "B2B", "C2C", "B2G"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Big Data",
    pregunta: "¿Cuáles son las 3 V's originales del Big Data?",
    opciones: [
      "Volumen, Velocidad, Variedad",
      "Verdad, Valor, Volumen",
      "Visualización, Validación, Velocidad",
      "Vertical, Virtual, Visual",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Gobernanza de TI",
    pregunta: "¿Qué framework es estándar para la gobernanza de TI?",
    opciones: ["COBIT", "Scrum", "PMBOK", "HTML"],
    respuestaCorrecta: 0,
    explicacion: "COBIT (Control Objectives for Information and Related Technologies) es de ISACA.",
  },
  {
    tema: "Sistemas de información",
    pregunta: "¿Qué es un sistema de información estratégico?",
    opciones: [
      "Un SI que da ventaja competitiva y apoya la estrategia de la organización",
      "Un SI que solo funciona en la nube",
      "Un SI que solo usan los programadores",
      "Un SI que procesa transacciones rápidamente",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Ética en TI",
    pregunta: "¿Qué aspectos abarca la ética en los sistemas de información?",
    opciones: [
      "Privacidad, propiedad intelectual, seguridad y acceso equitativo",
      "Solo el cumplimiento legal",
      "Solo la protección de contraseñas",
      "Solo el uso de software con licencia",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Outsourcing",
    pregunta: "¿Qué es el outsourcing de SI?",
    opciones: [
      "Contratar a un proveedor externo para que desarrolle o gestione los sistemas de información",
      "Comprar hardware nuevo",
      "Desarrollar software internamente",
      "Instalar el sistema operativo",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "IoT",
    pregunta: "¿Qué es el Internet de las Cosas (IoT)?",
    opciones: [
      "La interconexión de dispositivos físicos que recopilan y comparten datos a través de Internet",
      "Una red social para dispositivos",
      "Un nuevo tipo de computadora",
      "Un protocolo de correo electrónico",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Normalización",
    pregunta: "¿Qué busca la normalización en bases de datos relacionales?",
    opciones: [
      "Eliminar la redundancia y las dependencias parciales/transitivas",
      "Hacer las tablas más grandes",
      "Duplicar los datos para respaldo",
      "Acelerar las consultas sin importar la estructura",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "SQL",
    pregunta: "¿Qué tipo de lenguaje es SQL?",
    opciones: [
      "Un lenguaje declarativo para gestionar bases de datos relacionales",
      "Un lenguaje de programación orientado a objetos",
      "Un lenguaje de marcado como HTML",
      "Un protocolo de red",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Clave primaria",
    pregunta: "¿Qué es una clave primaria en una base de datos?",
    opciones: [
      "Un campo o conjunto de campos que identifica de forma única cada registro de una tabla",
      "La contraseña de la base de datos",
      "El primer campo de cualquier tabla",
      "Un índice que permite búsquedas rápidas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Virtualización",
    pregunta: "¿Qué permite la virtualización en TI?",
    opciones: [
      "Ejecutar múltiples sistemas operativos o aplicaciones en un mismo hardware físico",
      "Crear hologramas 3D",
      "Programar en realidad virtual",
      "Eliminar la necesidad de servidores",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "ITIL",
    pregunta: "¿Para qué se usa ITIL?",
    opciones: [
      "Para gestionar los servicios de TI con mejores prácticas",
      "Para diseñar interfaces gráficas",
      "Para programar en Java",
      "Para auditar estados financieros",
    ],
    respuestaCorrecta: 0,
  },
];

/* ── Redes y Comunicaciones de Datos ────────────────────────────────── */

const REDES: PreguntaSin[] = [
  {
    tema: "Modelo OSI",
    pregunta: "¿Cuántas capas tiene el modelo OSI?",
    opciones: ["7", "4", "5", "6"],
    respuestaCorrecta: 0,
    explicacion: "Física, Enlace de datos, Red, Transporte, Sesión, Presentación, Aplicación.",
  },
  {
    tema: "TCP/IP",
    pregunta: "¿Cuántas capas tiene el modelo TCP/IP?",
    opciones: ["4", "7", "5", "3"],
    respuestaCorrecta: 0,
    explicacion: "Acceso a red, Internet, Transporte, Aplicación.",
  },
  {
    tema: "Capa de red",
    pregunta: "¿Qué protocolo opera en la capa de red del modelo OSI?",
    opciones: ["IP", "TCP", "HTTP", "Ethernet"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Capa de transporte",
    pregunta: "¿Cuál es la diferencia principal entre TCP y UDP?",
    opciones: [
      "TCP es orientado a conexión y confiable; UDP es sin conexión y no garantiza entrega",
      "TCP es más rápido que UDP",
      "UDP es orientado a conexión y TCP no",
      "No hay diferencia, son lo mismo",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Direccionamiento IP",
    pregunta: "¿Cuántos bits tiene una dirección IPv4?",
    opciones: ["32", "64", "128", "16"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Subnetting",
    pregunta: "¿Para qué se utiliza el subnetting?",
    opciones: [
      "Para dividir una red grande en subredes más pequeñas y eficientes",
      "Para conectar dos redes diferentes",
      "Para cifrar los datos",
      "Para aumentar la velocidad de Internet",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Topologías",
    pregunta: "¿Cuál de estas es una topología de red?",
    opciones: ["Estrella", "Cuadrado", "Triángulo", "Hexágono"],
    respuestaCorrecta: 0,
    explicacion: "Las topologías básicas son: bus, estrella, anillo, malla y árbol.",
  },
  {
    tema: "Dispositivos de red",
    pregunta: "¿En qué capa del modelo OSI opera un switch?",
    opciones: ["Capa 2 (enlace de datos)", "Capa 1 (física)", "Capa 3 (red)", "Capa 7 (aplicación)"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Dispositivos de red",
    pregunta: "¿En qué capa del modelo OSI opera un router?",
    opciones: ["Capa 3 (red)", "Capa 2 (enlace de datos)", "Capa 4 (transporte)", "Capa 1 (física)"],
    respuestaCorrecta: 0,
  },
  {
    tema: "DNS",
    pregunta: "¿Qué hace el sistema DNS?",
    opciones: [
      "Traduce nombres de dominio a direcciones IP",
      "Cifra las comunicaciones",
      "Filtra el tráfico de red",
      "Asigna direcciones IP automáticamente",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "DHCP",
    pregunta: "¿Qué protocolo asigna direcciones IP automáticamente a los dispositivos?",
    opciones: ["DHCP", "DNS", "FTP", "SMTP"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Máscara de subred",
    pregunta: "¿Qué indica la máscara de subred?",
    opciones: [
      "Qué parte de la dirección IP identifica la red y qué parte identifica al host",
      "La velocidad de la conexión",
      "El país de origen del servidor",
      "El tipo de cifrado utilizado",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Medios de transmisión",
    pregunta: "¿Qué tipo de cable permite mayor velocidad y distancia?",
    opciones: ["Fibra óptica", "Cable coaxial", "Cable UTP Cat5", "Cable telefónico"],
    respuestaCorrecta: 0,
  },
  {
    tema: "HTTP",
    pregunta: "¿En qué capa del modelo OSI opera HTTP?",
    opciones: ["Capa 7 (aplicación)", "Capa 4 (transporte)", "Capa 3 (red)", "Capa 2 (enlace)"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Direccionamiento",
    pregunta: "¿Qué es una dirección MAC?",
    opciones: [
      "Una dirección física única de 48 bits asignada a cada tarjeta de red",
      "La contraseña del WiFi",
      "Una dirección IP especial",
      "El nombre del fabricante del router",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "VLAN",
    pregunta: "¿Qué es una VLAN?",
    opciones: [
      "Una red de área local virtual que agrupa dispositivos lógicamente independientemente de su ubicación física",
      "Una red privada virtual (VPN)",
      "Un tipo de cable de red",
      "Un protocolo de encriptación",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "Firewall",
    pregunta: "¿Cuál es la función principal de un firewall?",
    opciones: [
      "Filtrar el tráfico de red según reglas de seguridad",
      "Acelerar la conexión a Internet",
      "Almacenar archivos en la nube",
      "Traducir nombres de dominio",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "IPv6",
    pregunta: "¿Cuántos bits tiene una dirección IPv6?",
    opciones: ["128", "32", "64", "256"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Capa física",
    pregunta: "¿Qué se define en la capa física del modelo OSI?",
    opciones: [
      "Los medios, señales, conectores y especificaciones eléctricas/ópticas",
      "Los protocolos de enrutamiento",
      "El formato de los paquetes",
      "La autenticación de usuarios",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "NAT",
    pregunta: "¿Qué hace NAT (Network Address Translation)?",
    opciones: [
      "Traduce direcciones IP privadas a una dirección IP pública para acceder a Internet",
      "Cifra los datos de la red",
      "Asigna nombres de dominio",
      "Mide la velocidad de la conexión",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "WiFi",
    pregunta: "¿Qué estándar define las redes WiFi?",
    opciones: ["IEEE 802.11", "IEEE 802.3", "IEEE 802.1Q", "IEEE 802.15"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Puertos",
    pregunta: "¿Qué puerto usa HTTP por defecto?",
    opciones: ["80", "443", "21", "25"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Puertos",
    pregunta: "¿Qué puerto usa HTTPS por defecto?",
    opciones: ["443", "80", "8080", "22"],
    respuestaCorrecta: 0,
  },
  {
    tema: "Enrutamiento",
    pregunta: "¿Qué es una tabla de enrutamiento?",
    opciones: [
      "Una estructura que almacena las rutas que un router usa para reenviar paquetes",
      "Una lista de usuarios autorizados",
      "Un registro de todas las páginas visitadas",
      "Una base de datos de contraseñas",
    ],
    respuestaCorrecta: 0,
  },
  {
    tema: "ARP",
    pregunta: "¿Para qué se usa el protocolo ARP?",
    opciones: [
      "Para resolver una dirección IP a su dirección MAC correspondiente en la red local",
      "Para asignar direcciones IP",
      "Para cifrar los paquetes",
      "Para gestionar el correo electrónico",
    ],
    respuestaCorrecta: 0,
  },
];

/* ── Sembrador ──────────────────────────────────────────────────────── */

// Se conserva temporalmente el banco de demostración en el historial del
// archivo para facilitar la migración de instalaciones antiguas. No se usa
// para sembrar: el único banco activo está en contenidoCiclo6.ts.
void [ARQ_NEGOCIO, CALCULO_II, DISENO_EXP, FUNDAMENTOS_SI, REDES];

/**
 * El banco anterior era una demostración genérica. El actual se desprende de
 * los PPT y PDF descargados en «Ciclo 6» y conserva la fuente de cada ítem.
 * Si en una instalación antigua quedan preguntas sin fuente, se reemplazan
 * una sola vez; las que ya son del material real y su progreso se respetan.
 */
async function sembrarContenido(cursoId: number, contenido: ContenidoCurso): Promise<void> {
  const existentes = await preguntasDeCurso(cursoId);
  const tieneMaterialReal = existentes.some((pregunta) => Boolean(pregunta.fuente));
  const coincide = (pregunta: PreguntaSin, existente: PreguntaCurso): boolean => {
    if (existente.fuente !== pregunta.fuente) return false;
    if (existente.pregunta === pregunta.pregunta) return true;
    // La primera versión de las preguntas de aplicación ponía la definición
    // como alternativa. Se reconoce para reemplazarla sin perder aciertos.
    const clave = pregunta.opciones[pregunta.respuestaCorrecta];
    return pregunta.pregunta.startsWith("Una situación requiere lo siguiente:")
      && existente.pregunta === `¿En cuál situación corresponde usar ${clave}?`;
  };

  if (!tieneMaterialReal) {
    if (existentes.length > 0) {
      await db.preguntasCurso.bulkDelete(existentes.flatMap((pregunta) => pregunta.id == null ? [] : [pregunta.id]));
    }
    await agregarPreguntas(contenido.preguntas.map((pregunta) => ({ ...pregunta, cursoId })));
  } else {
    // En cada ampliación se agregan ítems nuevos y se mejora la explicación
    // de los ya vistos. Las estadísticas personales nunca se tocan.
    const actualizaciones = contenido.preguntas.flatMap((pregunta) => {
      const existente = existentes.find((item) => coincide(pregunta, item));
      if (existente?.id == null) return [];
      const cambio = existente.tema !== pregunta.tema
        || existente.pregunta !== pregunta.pregunta
        || existente.explicacion !== pregunta.explicacion
        || existente.respuestaCorrecta !== pregunta.respuestaCorrecta
        || JSON.stringify(existente.opciones) !== JSON.stringify(pregunta.opciones);
      return cambio ? [{ id: existente.id, cambios: {
        tema: pregunta.tema,
        pregunta: pregunta.pregunta,
        opciones: pregunta.opciones,
        respuestaCorrecta: pregunta.respuestaCorrecta,
        explicacion: pregunta.explicacion,
      } }] : [];
    });
    await Promise.all(actualizaciones.map(({ id, cambios }) => db.preguntasCurso.update(id, cambios)));
    const nuevas = contenido.preguntas.filter(
      (pregunta) => !existentes.some((existente) => coincide(pregunta, existente)),
    );
    if (nuevas.length > 0) await agregarPreguntas(nuevas.map((pregunta) => ({ ...pregunta, cursoId })));
  }

  const tarjetas = await db.tarjetasEstudio.where("cursoId").equals(cursoId).toArray();
  const nuevasTarjetas = contenido.tarjetas.filter(
    (tarjeta) => !tarjetas.some((existente) => existente.frente === tarjeta.frente && existente.fuente === tarjeta.fuente),
  );
  if (nuevasTarjetas.length > 0) {
    await db.tarjetasEstudio.bulkAdd(nuevasTarjetas.map((tarjeta) => ({ ...tarjeta, cursoId, creada: Date.now() })));
  }
}

/**
 * Prepara preguntas y tarjetas para los cursos activos. Si todavía no se
 * sincronizó el horario, hay un banco temporal de los cinco cursos para que
 * Estudio jamás se vea vacío al abrir la app por primera vez.
 */
export async function sembrarPreguntas(): Promise<void> {
  const cursos = await cursosActivos();
  let encontroCurso = false;

  for (const curso of cursos) {
    if (curso.id == null) continue;
    const contenido = contenidoParaCurso(curso.nombre);
    if (!contenido) continue;
    encontroCurso = true;
    await sembrarContenido(curso.id, contenido);
  }

  if (!encontroCurso) {
    await sembrarContenido(0, {
      nombre: "Banco temporal del Ciclo 6",
      alias: /./,
      preguntas: CONTENIDO_CICLO6.flatMap((contenido) => contenido.preguntas),
      tarjetas: CONTENIDO_CICLO6.flatMap((contenido) => contenido.tarjetas),
      conceptos: [],
    });
  }
}
