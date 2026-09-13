import type { DiaSemana, HorarioModo, ModoControl, UsoApp } from "./tipos";

export function diaLocal(fecha = new Date()): string {
  return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, "0"), String(fecha.getDate()).padStart(2, "0")].join("-");
}

export function desplazarDia(dia: string, cantidad: number): string {
  const fecha = new Date(dia + "T12:00:00");
  fecha.setDate(fecha.getDate() + cantidad);
  return diaLocal(fecha);
}

export function duracion(ms: number): string {
  const minutos = Math.floor(Math.max(0, ms) / 60_000);
  return minutos >= 60 ? Math.floor(minutos / 60) + " h " + (minutos % 60) + " min" : minutos + " min";
}

/** Solo presentación del estado horario; el bloqueo corresponde al motor nativo. */
export function horarioAhora(horario: HorarioModo, ahora = new Date()): boolean {
  const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
  const inicio = minutos(horario.desde);
  const fin = minutos(horario.hasta);
  const actual = ahora.getHours() * 60 + ahora.getMinutes();
  const aplica = (dia: number) => horario.dias.length === 0 || horario.dias.includes(dia as DiaSemana);
  if (inicio === fin) return false;
  if (inicio < fin) return aplica(ahora.getDay()) && actual >= inicio && actual < fin;
  return (actual >= inicio && aplica(ahora.getDay())) ||
    (actual < fin && aplica((ahora.getDay() + 6) % 7));
}

export function modosAhora(modos: ModoControl[], ahora = new Date()): ModoControl[] {
  return modos.filter((modo) => modo.activo && modo.horarios.some((h) => horarioAhora(h, ahora)));
}

export function sumarUso(apps: UsoApp[]): UsoApp[] {
  const porApp = new Map<string, UsoApp>();
  for (const app of apps) {
    const anterior = porApp.get(app.paquete) ?? { paquete: app.paquete, ms: 0, aperturas: 0 };
    porApp.set(app.paquete, { paquete: app.paquete, ms: anterior.ms + app.ms, aperturas: anterior.aperturas + app.aperturas });
  }
  return [...porApp.values()].sort((a, b) => b.ms - a.ms);
}

export function normalizarDominio(valor: string): string {
  // Acepta lo que sea que pegue el usuario y extrae el dominio: quita esquema
  // (http/https), "www.", usuario, puerto, ruta, query y fragmento. Así puede
  // pegar la URL completa (https://www.instagram.com/p/123) y se guarda
  // "instagram.com" sin obligarlo a limpiarla a mano.
  let d = valor.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // esquema
  d = d.replace(/^[^/@]*@/, "");                 // usuario:clave@
  d = d.split(/[/?#]/)[0];                        // ruta, query, fragmento
  d = d.split(":")[0];                            // puerto
  d = d.replace(/^www\./, "");                    // www.
  d = d.replace(/\.+$/, "");                      // punto final
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(d)) {
    throw new Error("No reconocí un dominio ahí. Escribe algo como instagram.com (o pega su enlace).");
  }
  return d;
}
