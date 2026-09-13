import { useState } from "react";
import { ChevronRight, Search, Trash2 } from "lucide-react";
import { guardarReglas } from "../../control/almacen";
import { motorControl } from "../../control/servicio";
import { diaLocal, desplazarDia, duracion, sumarUso } from "../../control/presentacion";
import type { AppInstalada, LimiteApp, ReglasControl } from "../../control/tipos";
import { Aviso, Dias, Editor, EstadoAccion, Guardar, IconoApp, Interruptor, Titulo, useAccion, useConsulta, Vacio, type PropsReglas } from "./comun";

export function Apps({ reglas }: PropsReglas) {
  const [buscar, setBuscar] = useState("");
  const [edicion, setEdicion] = useState<{ app: AppInstalada; reglas: ReglasControl }>();
  const consulta = useConsulta(async () => {
    const hoy = diaLocal();
    const [apps, uso] = await Promise.all([motorControl().listarApps(), motorControl().usoRango({ desde: desplazarDia(hoy, -6), hasta: hoy })]);
    const totales = sumarUso(uso.dias.flatMap((d) => d.apps));
    return apps.apps.map((app) => ({ app, uso: totales.find((u) => u.paquete === app.paquete)?.ms ?? 0 }))
      .sort((a, b) => b.uso - a.uso || a.app.nombre.localeCompare(b.app.nombre));
  });
  const lista = consulta.datos?.filter(({ app }) => (app.nombre + " " + app.paquete).toLowerCase().includes(buscar.toLowerCase()));
  return <><Titulo titulo="Apps" detalle="Ordenadas por tiempo registrado en los últimos 7 días, incluido hoy." />
    <label><span className="ct-fila"><Search size={16} />Buscar aplicación</span><input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} /></label>
    <Aviso error={consulta.error} reintentar={() => void consulta.recargar()} />
    <div className="ct-lista" style={{ marginTop: 14 }}>{lista?.map(({ app, uso }) => {
      const limite = reglas.limites.find((l) => l.paquete === app.paquete);
      return <button key={app.paquete} className="ct-card ct-btn ct-fila" style={{ textAlign: "left", justifyContent: "start" }} onClick={() => setEdicion({ app, reglas })}>
        <IconoApp app={app} /><span className="ct-crece"><strong className="ct-bloque">{app.nombre}</strong><small className="ct-bloque">{limite ? (limite.activo ? limite.minutosDia + " min/día" : "Límite inactivo") : "Sin límite"}</small><span className="ct-numero">{duracion(uso)}</span></span><ChevronRight size={17} />
      </button>;
    })}</div>
    {lista?.length === 0 && <Vacio>No hay aplicaciones para esta búsqueda.</Vacio>}
    {!consulta.datos && consulta.cargando && <Vacio>Leyendo aplicaciones…</Vacio>}
    {edicion && <EditarApp app={edicion.app} reglas={edicion.reglas} onClose={() => setEdicion(undefined)} />}
  </>;
}

function EditarApp({ app, reglas, onClose }: PropsReglas & { app: AppInstalada; onClose: () => void }) {
  const anterior = reglas.limites.find((l) => l.paquete === app.paquete);
  const [limite, setLimite] = useState<LimiteApp>(anterior ?? { paquete: app.paquete, minutosDia: 60, dias: [], activo: true });
  const accion = useAccion();
  const guardar = async (borrar = false) => {
    await guardarReglas({ ...reglas, limites: [...reglas.limites.filter((l) => l.paquete !== app.paquete), ...(borrar ? [] : [limite])] });
    onClose();
  };
  return <Editor titulo={app.nombre} onClose={onClose}><form className="ct-form" onSubmit={(e) => { e.preventDefault(); void accion.ejecutar(() => guardar()); }}>
    <fieldset disabled={accion.ocupado}>
      <label>Minutos por día<input type="number" required min="0" max="1440" step="1" value={limite.minutosDia} onChange={(e) => setLimite({ ...limite, minutosDia: e.target.valueAsNumber })} /></label>
      <small>0 minutos bloquea la aplicación todo el día.</small>
      <label>Aperturas por día (opcional)<input type="number" min="0" step="1" value={limite.aperturasDia ?? ""} onChange={(e) => setLimite({ ...limite, aperturasDia: e.target.value === "" ? undefined : e.target.valueAsNumber })} /></label>
      <Dias valor={limite.dias} onChange={(dias) => setLimite({ ...limite, dias })} />
      <Interruptor titulo="Límite activo" valor={limite.activo} onChange={(activo) => setLimite({ ...limite, activo })} />
    </fieldset>
    <EstadoAccion accion={accion} /><Guardar ocupado={accion.ocupado} />
    {anterior && <button type="button" className="ct-btn" disabled={accion.ocupado} onClick={() => void accion.ejecutar(() => guardar(true))}><Trash2 size={16} />Eliminar límite</button>}
  </form></Editor>;
}
