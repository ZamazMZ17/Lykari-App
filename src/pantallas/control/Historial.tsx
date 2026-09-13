import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { tablasControl } from "../../control/almacen";
import { diaLocal, desplazarDia, duracion, sumarUso } from "../../control/presentacion";
import { motorControl } from "../../control/servicio";
import { Aviso, Titulo, useConsulta, Vacio } from "./comun";

export function Historial() {
  const [zoom, setZoom] = useState<"semana" | "mes">("semana");
  const [ancla, setAncla] = useState(diaLocal);
  const fecha = new Date(ancla + "T12:00:00");
  const desde = zoom === "semana" ? desplazarDia(ancla, -((fecha.getDay() + 6) % 7)) : diaLocal(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
  const hasta = zoom === "semana" ? desplazarDia(desde, 6) : diaLocal(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0));
  const filas = useLiveQuery(async () => {
    try { return { datos: await tablasControl().controlUsoDiario.where("dia").between(desde, hasta, true, true).toArray(), error: "" }; }
    catch { return { datos: undefined, error: "No se pudo leer el historial local." }; }
  }, [desde, hasta]);
  const consulta = useConsulta(async () => {
    const [apps, extensiones] = await Promise.all([motorControl().listarApps(), motorControl().extensiones({ desde: new Date(desde + "T00:00:00").getTime() })]);
    return { apps: apps.apps, extensiones: extensiones.extensiones.filter((e) => diaLocal(new Date(e.fecha)) <= hasta) };
  }, [desde, hasta]);
  const mover = (cantidad: number) => setAncla(zoom === "semana" ? desplazarDia(desde, 7 * cantidad) : diaLocal(new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1)));
  const resumen = sumarUso(filas?.datos ?? []);
  const nombres = new Map(consulta.datos?.apps.map((a) => [a.paquete, a.nombre]));
  const dias: string[] = [];
  for (let dia = desde; dia <= hasta && dia <= diaLocal(); dia = desplazarDia(dia, 1)) dias.push(dia);
  return <><Titulo titulo="Historial" detalle="Uso guardado por día y aplicaciones. Los días sin datos figuran como sin registro." />
    <div className="ct-fila ct-wrap"><button className="ct-btn" aria-pressed={zoom === "semana"} onClick={() => setZoom("semana")}>Semana</button><button className="ct-btn" aria-pressed={zoom === "mes"} onClick={() => setZoom("mes")}>Mes</button><button className="ct-btn" onClick={() => setAncla(diaLocal())}>Hoy</button></div>
    <div className="ct-fila ct-entre" style={{ margin: "14px 0" }}><button className="ct-btn" aria-label="Periodo anterior" onClick={() => mover(-1)}><ChevronLeft size={18} /></button><span className="ct-numero">{desde}<br />{hasta}</span><button className="ct-btn" aria-label="Periodo siguiente" disabled={hasta >= diaLocal()} onClick={() => mover(1)}><ChevronRight size={18} /></button></div>
    <Aviso error={filas?.error ?? ""} /><Aviso error={consulta.error} reintentar={() => void consulta.recargar()} />
    <div className="ct-lista">
      <div className="ct-card"><span className="eyebrow">Tiempo registrado</span><div className="ct-total ct-numero">{filas?.datos ? duracion(resumen.reduce((s, a) => s + a.ms, 0)) : "…"}</div></div>
      {!filas && <Vacio>Leyendo historial…</Vacio>}
      {filas?.datos && <><div className="ct-card"><h3>Por aplicación</h3>{!resumen.length ? <Vacio>No hay registro en este periodo.</Vacio> : <table className="ct-tabla"><thead><tr><th>App</th><th>Tiempo</th><th>Aperturas</th></tr></thead><tbody>{resumen.map((a) => <tr key={a.paquete}><td>{nombres.get(a.paquete) ?? a.paquete}</td><td className="ct-numero">{duracion(a.ms)}</td><td className="ct-numero">{a.aperturas}</td></tr>)}</tbody></table>}</div>
        <div className="ct-card"><h3>Por día</h3>{dias.map((dia) => {
          const registros = filas.datos.filter((r) => r.dia === dia);
          return <div className="ct-fila ct-entre" style={{ padding: "7px 0", borderBottom: "1px solid var(--line)" }} key={dia}><span className="ct-numero">{dia.slice(5)}</span><span className="ct-numero">{registros.length ? duracion(registros.reduce((s, r) => s + r.ms, 0)) : "Sin registro"}</span></div>;
        })}</div></>}
      <div className="ct-card"><h3>Extensiones</h3>{consulta.datos?.extensiones.length === 0 && <Vacio>No hay extensiones registradas en este periodo.</Vacio>}{consulta.datos?.extensiones.map((e, i) => <p key={i}>{nombres.get(e.paquete) ?? e.paquete} · <span className="ct-numero">+{e.minutos} min</span><br /><small>{new Date(e.fecha).toLocaleString("es-PE")}</small></p>)}</div>
    </div>
  </>;
}
