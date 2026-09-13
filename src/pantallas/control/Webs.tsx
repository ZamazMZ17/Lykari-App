import { useState } from "react";
import { Globe, Plus, Trash2 } from "lucide-react";
import { guardarReglas } from "../../control/almacen";
import { normalizarDominio } from "../../control/presentacion";
import type { ReglaWeb, ReglasControl } from "../../control/tipos";
import { Editor, EstadoAccion, Guardar, Interruptor, Titulo, useAccion, Vacio, type PropsReglas } from "./comun";

export function Webs({ reglas }: PropsReglas) {
  const [edicion, setEdicion] = useState<{ regla: ReglaWeb; reglas: ReglasControl }>();
  return <><Titulo titulo="Webs" detalle="Límites por dominio o palabra clave en los navegadores compatibles." />
    <button className="ct-btn ct-primario" onClick={() => setEdicion({ reglas, regla: { id: crypto.randomUUID(), tipo: "dominio", valor: "", minutosDia: null, activo: true } })}><Plus size={16} />Agregar regla</button>
    <div className="ct-lista" style={{ marginTop: 14 }}>{reglas.webs.map((r) => <button className="ct-btn ct-card ct-fila" style={{ textAlign: "left", justifyContent: "start" }} key={r.id} onClick={() => setEdicion({ regla: r, reglas })}>
      <Globe size={19} /><span><strong className="ct-bloque">{r.valor}</strong><small>{r.tipo === "dominio" ? "Dominio" : "Palabra"} · {r.activo ? (r.minutosDia === null ? "Bloqueada siempre" : r.minutosDia + " min/día") : "Inactiva"}</small></span>
    </button>)}</div>
    {!reglas.webs.length && <Vacio>No hay reglas web guardadas.</Vacio>}
    {edicion && <EditarWeb inicial={edicion.regla} reglas={edicion.reglas} onClose={() => setEdicion(undefined)} />}
  </>;
}

function EditarWeb({ inicial, reglas, onClose }: PropsReglas & { inicial: ReglaWeb; onClose: () => void }) {
  const [regla, setRegla] = useState(inicial);
  const accion = useAccion();
  const existe = reglas.webs.some((r) => r.id === regla.id);
  const guardar = async (borrar = false) => {
    const valor = borrar ? regla.valor : regla.tipo === "dominio" ? normalizarDominio(regla.valor) : regla.valor.trim().toLowerCase();
    if (!borrar && !valor) throw new Error("Escribe el dominio o la palabra.");
    if (!borrar && reglas.webs.some((r) => r.id !== regla.id && r.tipo === regla.tipo && r.valor === valor)) throw new Error("Ya hay una regla para ese valor.");
    await guardarReglas({ ...reglas, webs: [...reglas.webs.filter((r) => r.id !== regla.id), ...(borrar ? [] : [{ ...regla, valor }])],
      modos: borrar ? reglas.modos.map((m) => ({ ...m, webs: m.webs.filter((id) => id !== regla.id) })) : reglas.modos });
    onClose();
  };
  return <Editor titulo={existe ? "Editar regla web" : "Nueva regla web"} onClose={onClose}><form className="ct-form" onSubmit={(e) => { e.preventDefault(); void accion.ejecutar(() => guardar()); }}>
    <fieldset disabled={accion.ocupado}>
      <label>Tipo<select value={regla.tipo} onChange={(e) => setRegla({ ...regla, tipo: e.target.value as ReglaWeb["tipo"] })}><option value="dominio">Dominio</option><option value="palabra">Palabra clave</option></select></label>
      <label>{regla.tipo === "dominio" ? "Dominio sin https://" : "Palabra clave"}<input required value={regla.valor} onChange={(e) => setRegla({ ...regla, valor: e.target.value })} placeholder={regla.tipo === "dominio" ? "instagram.com" : "Palabra"} /></label>
      <Interruptor titulo="Bloquear siempre" valor={regla.minutosDia === null} onChange={(si) => setRegla({ ...regla, minutosDia: si ? null : 30 })} />
      {regla.minutosDia !== null && <label>Minutos por día<input type="number" required min="0" max="1440" step="1" value={regla.minutosDia} onChange={(e) => setRegla({ ...regla, minutosDia: e.target.valueAsNumber })} /></label>}
      <Interruptor titulo="Regla activa" valor={regla.activo} onChange={(activo) => setRegla({ ...regla, activo })} />
    </fieldset>
    <EstadoAccion accion={accion} /><Guardar ocupado={accion.ocupado} />
    {existe && <button className="ct-btn" type="button" disabled={accion.ocupado} onClick={() => void accion.ejecutar(() => guardar(true))}><Trash2 size={16} />Eliminar regla</button>}
  </form></Editor>;
}
