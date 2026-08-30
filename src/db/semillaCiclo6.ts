import { actualizarCurso, cursosActivos, crearCurso, type NuevoCurso } from "./cursos";
import { agregarEvaluacion, type NuevaEvaluacion } from "./evaluaciones";
import { crearTarea, tareas } from "./capturas";

/**
 * Los 5 cursos reales del ciclo 6 (UPC, 2026-20), tal como salen del sílabo
 * de cada uno: horario semanal, fórmula de la nota final y la tabla de
 * evaluaciones con su peso. Es la única semilla de datos reales que tiene la
 * app — vive aquí, no en un formulario, porque cargarla a mano un curso a la
 * vez no era el punto.
 */
const DESDE = "2026-08-24";
const HASTA = "2026-12-06";

const FORMULA_7 =
  "NF = 0.10·PC1 + 0.10·TB1 + 0.20·EA1 + 0.10·PC2 + 0.15·DD1 + 0.15·TB2 + 0.20·EB1";

/** Las 4 prácticas/trabajos/parciales/final son iguales en 4 de los 5 cursos;
 *  solo cambia si el trabajo 2 o la evaluación de desempeño va primero en la
 *  tabla del sílabo (cosmético, no afecta el cálculo). */
function evaluaciones7(orden: "dd-tb" | "tb-dd"): NuevaEvaluacion[] {
  const base: NuevaEvaluacion[] = [
    { nombre: "Práctica Calificada 1", peso: 10, semana: 4, recuperable: true },
    { nombre: "Trabajo 1", peso: 10, semana: 7, recuperable: false },
    { nombre: "Evaluación Parcial 1", peso: 20, semana: 8, recuperable: true },
    { nombre: "Práctica Calificada 2", peso: 10, semana: 12, recuperable: true },
  ];
  const dd: NuevaEvaluacion = {
    nombre: "Evaluación de Desempeño 1",
    peso: 15,
    semana: 15,
    recuperable: false,
  };
  const tb2: NuevaEvaluacion = { nombre: "Trabajo 2", peso: 15, semana: 15, recuperable: false };
  const final: NuevaEvaluacion = {
    nombre: "Evaluación Final 1",
    peso: 20,
    semana: 16,
    recuperable: true,
  };
  return orden === "dd-tb" ? [...base, dd, tb2, final] : [...base, tb2, dd, final];
}

interface CursoSemilla {
  datos: NuevoCurso;
  evaluaciones: NuevaEvaluacion[];
}

const CURSOS: CursoSemilla[] = [
  {
    datos: {
      nombre: "Arquitectura de Negocio",
      codigo: "1ASI0704",
      nrc: "9145",
      profesor: "Emilio Herrera Trujillo",
      modalidad: "presencial",
      creditos: 4,
      desde: DESDE,
      hasta: HASTA,
      formulaNota: FORMULA_7,
      bloques: [
        { dia: 0, horaInicio: "07:00", horaFin: "08:59", salon: "San Miguel · SB709" },
        { dia: 1, horaInicio: "07:00", horaFin: "08:59", salon: "San Miguel · SB310" },
        { dia: 3, horaInicio: "08:00", horaFin: "09:59", salon: "San Miguel · SD404" },
      ],
    },
    evaluaciones: evaluaciones7("dd-tb"),
  },
  {
    datos: {
      nombre: "Cálculo II",
      codigo: "1AMA0263",
      nrc: "2823",
      profesor: "Armando Novoa Allagual",
      aad: "Violeta Bejarano Vilchez",
      modalidad: "semipresencial",
      creditos: 6,
      desde: DESDE,
      hasta: HASTA,
      formulaNota:
        "NF = 0.15·DD1 + 0.25·DD2 + 0.30·DD3 + 0.30·ZB1\nDDn = 15%·CV + 15%·ACT + 70%·EU\nZB1 = P1·(P2/12) + P2\nCon promedio acumulado ≥ 12.51 antes de la ZB, se puede exonerar la Exposición Final.",
      bloques: [
        { dia: 0, horaInicio: "13:00", horaFin: "14:59", salon: "San Miguel · SC409" },
        { dia: 3, horaInicio: "13:00", horaFin: "14:59", salon: "San Miguel · SC708" },
      ],
    },
    evaluaciones: [
      { nombre: "Evaluación de Desempeño 1 (DD1)", peso: 15, semana: 5, recuperable: false },
      { nombre: "Evaluación de Desempeño 2 (DD2)", peso: 25, semana: 10, recuperable: false },
      { nombre: "Evaluación de Desempeño 3 (DD3)", peso: 30, semana: 14, recuperable: false },
      { nombre: "Exposición Final (ZB1)", peso: 30, semana: 16, recuperable: false },
    ],
  },
  {
    datos: {
      nombre: "Diseño de Experimentos en SI",
      codigo: "1ASI0651",
      nrc: "9057",
      profesor: "Ruben Cerda Garcia",
      modalidad: "presencial",
      creditos: 4,
      desde: DESDE,
      hasta: HASTA,
      formulaNota: FORMULA_7,
      bloques: [
        { dia: 2, horaInicio: "19:00", horaFin: "20:59", salon: "San Miguel · SB605" },
        { dia: 2, horaInicio: "21:00", horaFin: "22:59", salon: "San Miguel · SB604" },
      ],
    },
    evaluaciones: evaluaciones7("dd-tb"),
  },
  {
    datos: {
      nombre: "Fundamentos de Sistemas de Información",
      codigo: "1ASI0393",
      nrc: "6525",
      profesor: "Gustavo Morales Flores",
      aad: "Fiorella Flores Caceres",
      modalidad: "semipresencial",
      creditos: 3,
      desde: DESDE,
      hasta: HASTA,
      formulaNota:
        "NF = 0.10·PC1 + 0.10·TB1 + 0.20·EA1 + 0.10·PC2 + 0.15·TB2 + 0.15·DD1 + 0.20·EB1",
      bloques: [{ dia: 5, horaInicio: "11:00", horaFin: "12:59", salon: "San Miguel · SB508" }],
    },
    evaluaciones: evaluaciones7("tb-dd"),
  },
  {
    datos: {
      nombre: "Redes y Comunicaciones de Datos",
      codigo: "1ASI0640",
      nrc: "7610",
      profesor: "Felix Canales Arias",
      modalidad: "presencial",
      creditos: 4,
      desde: DESDE,
      hasta: HASTA,
      formulaNota:
        "NF = 0.10·PC1 + 0.10·TB1 + 0.20·EA1 + 0.10·PC2 + 0.15·TB2 + 0.15·DD1 + 0.20·EB1",
      bloques: [
        { dia: 3, horaInicio: "19:00", horaFin: "21:59", salon: "San Miguel · SB606" },
        { dia: 4, horaInicio: "21:00", horaFin: "22:59", salon: "San Miguel · SC309" },
      ],
    },
    evaluaciones: evaluaciones7("tb-dd"),
  },
];

const TEXTO_TAREA = "Entregar Actividad 2 — Prototipo (Diseño de Experimentos en SI)";

/**
 * Crea los 5 cursos si todavía no existen (por nombre) y sincroniza los datos
 * del horario/sílabo de los que ya existen con lo de acá — así una corrección
 * a esta semilla (un salón mal tipeado, un bloque que faltaba) le llega al
 * curso ya cargado con solo volver a tocar el botón, en vez de quedar
 * pisada para siempre por el chequeo de "ya existe". Las evaluaciones no se
 * tocan en la sincronización: son otra tabla, y ahí es donde vive la nota
 * que el dueño ya haya cargado a mano.
 */
export async function sembrarCiclo6(): Promise<void> {
  const porNombre = new Map((await cursosActivos()).map((c) => [c.nombre, c]));
  for (const { datos, evaluaciones } of CURSOS) {
    const existente = porNombre.get(datos.nombre);
    if (existente) {
      await actualizarCurso(existente.id!, datos);
      continue;
    }
    const id = await crearCurso(datos);
    for (const ev of evaluaciones) await agregarEvaluacion(id, ev);
  }

  const yaExiste = (await tareas()).some((t) => t.texto === TEXTO_TAREA);
  if (!yaExiste) {
    await crearTarea({
      texto: TEXTO_TAREA,
      descripcion:
        "Grupal, 20 puntos, un intento. Grupo 2: Adrian Vilela, Fabiana Quintana, Jefferson Cossio, Josue Jimenez y tú.",
      vence: "2026-09-02",
    });
  }
}
