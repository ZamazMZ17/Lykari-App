import { aISO, desdeISO, diasEntre, indiceSemana, sumarDias, type DiaISO } from "./fecha";

/**
 * Las reglas son las de CLAUDE.md §6 y no son negociables:
 *
 * - Cuenta **días con registro**, no días perfectos.
 * - **Un día libre por semana** no rompe la racha. **Dos seguidos sí**, aunque
 *   caigan en semanas distintas.
 * - Al romperse **no vuelve a cero**: cada 7 días ganados dejan un nudo ámbar
 *   permanente. Lo ya hecho no se borra por fallar después.
 * - **Hoy nunca rompe nada.** El día no ha terminado; que aún no haya registro
 *   no es un fallo.
 */
export interface EstadoRacha {
  /** Días seguidos de la racha viva. */
  dias: number;
  /** Nudos ganados en toda la historia. Nunca bajan. */
  nudos: number;
  ultimoDiaConRegistro: DiaISO | null;
  /** El día libre gastado en la semana en curso, si se gastó. */
  diaLibreUsado: DiaISO | null;
  /** Si hoy ya tiene registro. Para no dar por perdido el día en curso. */
  hoyRegistrado: boolean;
}

const DIAS_POR_NUDO = 7;

const lunesDe = (dia: DiaISO): DiaISO => {
  const d = desdeISO(dia);
  return aISO(sumarDias(d, -indiceSemana(d)));
};

export function calcularRacha(
  registro: ReadonlySet<DiaISO>,
  desde: DiaISO,
  hoy: DiaISO,
): EstadoRacha {
  let dias = 0;
  let nudos = 0;
  let ultimoDiaConRegistro: DiaISO | null = null;
  let libreDeLaSemana: DiaISO | null = null;
  let semanaDelLibre: DiaISO | null = null;
  let anteriorVacio = false;

  const total = diasEntre(desde, hoy);
  for (let i = 0; i <= total; i++) {
    const dia = aISO(sumarDias(desdeISO(desde), i));
    const semana = lunesDe(dia);

    // Al cambiar de semana se recupera el día libre.
    if (semanaDelLibre !== semana) {
      semanaDelLibre = semana;
      libreDeLaSemana = null;
    }

    if (registro.has(dia)) {
      dias++;
      if (dias % DIAS_POR_NUDO === 0) nudos++;
      ultimoDiaConRegistro = dia;
      anteriorVacio = false;
      continue;
    }

    // Hoy no cuenta como fallo: todavía puede registrar algo.
    if (dia === hoy) break;

    const puedeGastarLibre = dias > 0 && libreDeLaSemana === null && !anteriorVacio;
    if (puedeGastarLibre) {
      libreDeLaSemana = dia;
    } else {
      dias = 0;
    }
    anteriorVacio = true;
  }

  return {
    dias,
    nudos,
    ultimoDiaConRegistro,
    diaLibreUsado: lunesDe(hoy) === semanaDelLibre ? libreDeLaSemana : null,
    hoyRegistrado: registro.has(hoy),
  };
}

/**
 * Largo de la bufanda, en las unidades del SVG. Crece con la racha y se topa:
 * más allá de cierto punto una bufanda más larga no dice nada nuevo.
 */
export function largoBufanda(dias: number): number {
  return Math.min(96, 20 + dias * 3.1);
}
