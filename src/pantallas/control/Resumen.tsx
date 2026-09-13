import { useEffect } from "react";
import { Clock3 } from "lucide-react";
import { motorControl } from "../../control/servicio";
import { duracion, modosAhora } from "../../control/presentacion";
import type { DiaSemana } from "../../control/tipos";
import { useTic } from "../../lib/ganchos";
import { Aviso, IconoApp, Titulo, useConsulta, Vacio, type PropsReglas } from "./comun";

export function Resumen({ reglas }: PropsReglas) {
  const consulta = useConsulta(async () => {
    const [uso, apps, extensiones] = await Promise.all([motorControl().usoHoy(), motorControl().listarApps(), motorControl().extensiones({ desde: new Date().setHours(0, 0, 0, 0) })]);
    return { uso: uso.apps, apps: apps.apps, extensiones: extensiones.extensiones };
  });
  const ahora = useTic(true, 30_000);
  const recargar = consulta.recargar;
  // Refresco por minuto para que el resumen no conserve datos de la apertura inicial.
  const minuto = Math.floor(ahora / 60_000);
  useEffect(() => { void recargar(); }, [minuto, recargar]);
  const modos = modosAhora(reglas.modos, new Date(ahora));
  const limites = reglas.limites.filter((l) => l.activo && (!l.dias.length || l.dias.includes(new Date(ahora).getDay() as DiaSemana)));
  const datos = consulta.datos;
  return <><Titulo titulo="Resumen" detalle="Tiempo registrado en el teléfono durante el día de hoy." />
    <Aviso error={consulta.error} reintentar={() => void consulta.recargar()} />
    {!datos ? <Vacio>{consulta.cargando ? "Leyendo el uso de hoy…" : "Sin datos disponibles."}</Vacio> : <div className="ct-lista">
      <div className="ct-card"><span className="eyebrow">Hoy · tiempo en pantalla</span><div className="ct-numero ct-total">{duracion(datos.uso.reduce((s, a) => s + a.ms, 0))}</div><small>{datos.uso.reduce((s, a) => s + a.aperturas, 0)} aperturas · {datos.uso.length} aplicaciones</small></div>
      <div className="ct-card"><h3 className="ct-fila"><Clock3 size={17} />Modo ahora</h3>{modos.length ? modos.map((m) => <p key={m.id}><span className="ct-corriendo">{m.nombre}</span> · {m.estrategia === "permitir" ? "Solo apps seleccionadas" : "Bloqueo de apps seleccionadas"}</p>) : <p>Ningún modo activo en este horario.</p>}</div>
      <h3>Apps con límite hoy</h3>
      {!limites.length && <Vacio>No hay límites activos para hoy.</Vacio>}
      {limites.map((limite) => {
        const uso = datos.uso.find((a) => a.paquete === limite.paquete);
        const app = datos.apps.find((a) => a.paquete === limite.paquete);
        const extra = datos.extensiones.filter((e) => e.paquete === limite.paquete).reduce((s, e) => s + e.minutos, 0);
        const disponible = (limite.minutosDia + extra) * 60_000;
        const restante = Math.max(0, disponible - (uso?.ms ?? 0));
        return <div className="ct-card" key={limite.paquete}><div className="ct-fila"><IconoApp app={app} /><strong>{app?.nombre ?? limite.paquete}</strong></div>
          <div className="ct-barra"><span style={{ width: Math.min(100, disponible ? (uso?.ms ?? 0) / disponible * 100 : 100) + "%" }} /></div>
          <p className="ct-numero">{duracion(uso?.ms ?? 0)} de {duracion(disponible)}</p><small>{duracion(restante)} restantes{extra > 0 ? " · incluye " + extra + " min de extensión" : ""}</small>
          {limite.aperturasDia !== undefined && <p>{uso?.aperturas ?? 0} de {limite.aperturasDia} aperturas · {Math.max(0, limite.aperturasDia - (uso?.aperturas ?? 0))} restantes</p>}
        </div>;
      })}
    </div>}</>;
}

