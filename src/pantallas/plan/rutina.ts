import type { Plan, RegistroPlan } from "../../db/db";
import { nivelActualDe, nivelesDe } from "../../db/planes";
import { hoyISO } from "../../lib/fecha";

/** El registro de hoy conserva su nivel y rotación incluso al subir de nivel. */
export function rutinaDeHoy(plan: Plan, registros: RegistroPlan[], dia = hoyISO()) {
  const registro = registros.find((r) => r.dia === dia);
  const nivel = nivelesDe(plan.categoria).find((n) => n.numero === registro?.nivelNumero)
    ?? nivelActualDe(plan);
  const completos = registros.filter((r) => r.nivelNumero === nivel.numero && r.completo).length;
  const indice = registro?.diaRutinaIndice ?? completos % nivel.dias.length;
  return { registro, diaIndice: nivel.dias[indice] ? indice : 0, diaRutina: nivel.dias[indice] ?? nivel.dias[0] };
}
