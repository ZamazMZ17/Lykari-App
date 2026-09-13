import { useState } from "react";
import { BellOff, BookOpen, GraduationCap, Moon, Plus, Trash2 } from "lucide-react";
import { guardarReglas } from "../../control/almacen";
import { motorControl } from "../../control/servicio";
import { horariosDeClase } from "../../control/horarioClases";
import type { HorarioModo, ModoControl, PlantillaModo, ReglasControl } from "../../control/tipos";
import { Aviso, Dias, Editor, EstadoAccion, Guardar, Interruptor, SelectorApps, Titulo, useAccion, useConsulta, Vacio, type PropsReglas } from "./comun";

const plantillas = [
  { tipo: "estudio" as const, nombre: "Estudio", icono: BookOpen, desde: "09:00", hasta: "11:00" },
  { tipo: "sueno" as const, nombre: "Sueño", icono: Moon, desde: "00:00", hasta: "05:00" },
  { tipo: "clase" as const, nombre: "En clase", icono: GraduationCap, desde: "08:00", hasta: "10:00" },
  { tipo: "propio" as const, nombre: "Nuevo modo", icono: Plus, desde: "09:00", hasta: "10:00" },
];

export function Modos({ reglas }: PropsReglas) {
  const [edicion, setEdicion] = useState<{ modo: ModoControl; reglas: ReglasControl }>();
  const [error, setError] = useState("");
  const crear = async (tipo: PlantillaModo) => {
    setError("");
    const plantilla = plantillas.find((p) => p.tipo === tipo)!;
    // "En clase" toma los bloques reales del horario de cursos de la app.
    let horarios: HorarioModo[] = [{ desde: plantilla.desde, hasta: plantilla.hasta, dias: tipo === "estudio" ? [1, 2, 3, 4, 5] : [] }];
    if (tipo === "clase") {
      const deClases = await horariosDeClase();
      if (deClases.length) horarios = deClases;
      else setError("No encontré bloques de clase en tu horario; usé un horario de ejemplo que puedes ajustar.");
    }
    setEdicion({ reglas, modo: { id: crypto.randomUUID(), nombre: plantilla.nombre, plantilla: tipo, activo: true, estrategia: "bloquear", apps: [], webs: [], silencio: tipo !== "propio", horarios } });
  };
  return <><Titulo titulo="Modos" detalle="Agrupa reglas por horario. Pueden silenciar el teléfono (No molestar) y bloquear apps. Un horario nocturno continúa al día siguiente." />
    <div className="ct-fila ct-wrap">{plantillas.map(({ tipo, nombre, icono: Icono }) => <button className="ct-btn" key={tipo} onClick={() => void crear(tipo)}><Icono size={16} />{nombre}</button>)}</div>
    {error && <small style={{ display: "block", marginTop: 8 }}>{error}</small>}
    <div className="ct-lista" style={{ marginTop: 14 }}>{reglas.modos.map((m) => <button key={m.id} className="ct-btn ct-card" style={{ textAlign: "left", justifyContent: "start" }} onClick={() => setEdicion({ modo: m, reglas })}>
      <span><strong className="ct-bloque">{m.nombre}</strong><small>{m.activo ? "Activo" : "Inactivo"} · {m.horarios.length} horarios · {m.apps.length} apps{m.silencio ? " · silencio" : ""}</small><span className="ct-bloque ct-numero">{m.horarios.map((h) => h.desde + "–" + h.hasta).join(" · ")}</span></span>
    </button>)}</div>
    {!reglas.modos.length && <Vacio>No hay modos guardados. Elige una plantilla para empezar.</Vacio>}
    {edicion && <EditarModo inicial={edicion.modo} reglas={edicion.reglas} onClose={() => setEdicion(undefined)} />}
  </>;
}

function EditarModo({ inicial, reglas, onClose }: PropsReglas & { inicial: ModoControl; onClose: () => void }) {
  const [modo, setModo] = useState(inicial);
  const accion = useAccion();
  const consulta = useConsulta(async () => (await motorControl().listarApps()).apps);
  const existe = reglas.modos.some((m) => m.id === modo.id);
  const guardar = async (borrar = false) => {
    if (!borrar && modo.horarios.some((h) => h.desde === h.hasta)) throw new Error("El inicio y el fin de cada horario deben ser distintos.");
    await guardarReglas({ ...reglas, modos: [...reglas.modos.filter((m) => m.id !== modo.id), ...(borrar ? [] : [{ ...modo, nombre: modo.nombre.trim() }])] });
    onClose();
  };
  return <Editor titulo={existe ? "Editar modo" : "Crear modo"} onClose={onClose}><form className="ct-form" onSubmit={(e) => { e.preventDefault(); void accion.ejecutar(() => guardar()); }}>
    <fieldset disabled={accion.ocupado}>
      <label>Nombre<input required value={modo.nombre} onChange={(e) => setModo({ ...modo, nombre: e.target.value })} /></label>
      {modo.horarios.map((h, i) => <div className="ct-card ct-lista" key={i}>
        <h3>Horario {i + 1}</h3><Dias valor={h.dias} onChange={(dias) => setModo({ ...modo, horarios: modo.horarios.map((actual, n) => n === i ? { ...h, dias } : actual) })} />
        <div className="ct-fila"><label className="ct-crece">Desde<input type="time" required value={h.desde} onChange={(e) => setModo({ ...modo, horarios: modo.horarios.map((actual, n) => n === i ? { ...h, desde: e.target.value } : actual) })} /></label>
          <label className="ct-crece">Hasta<input type="time" required value={h.hasta} onChange={(e) => setModo({ ...modo, horarios: modo.horarios.map((actual, n) => n === i ? { ...h, hasta: e.target.value } : actual) })} /></label></div>
        {h.hasta < h.desde && <small>Termina al día siguiente.</small>}
        {modo.horarios.length > 1 && <button type="button" className="ct-btn" onClick={() => setModo({ ...modo, horarios: modo.horarios.filter((_, n) => n !== i) })}><Trash2 size={16} />Quitar horario {i + 1}</button>}
      </div>)}
      <button className="ct-btn" type="button" onClick={() => setModo({ ...modo, horarios: [...modo.horarios, { dias: [], desde: "12:00", hasta: "13:00" }] })}><Plus size={16} />Agregar horario</button>
      <div className="ct-card"><Interruptor titulo="Silencio (No molestar)" valor={modo.silencio} onChange={(silencio) => setModo({ ...modo, silencio })} /><small><BellOff size={12} style={{ verticalAlign: "middle" }} /> Silencia llamadas, mensajes y notificaciones durante el horario. La alarma del despertador sigue sonando. Necesita el permiso «No molestar».</small></div>
      <label>Estrategia<select value={modo.estrategia} onChange={(e) => setModo({ ...modo, estrategia: e.target.value as ModoControl["estrategia"] })}><option value="bloquear">Bloquear las apps seleccionadas</option><option value="permitir">Permitir solo las apps seleccionadas</option></select></label>
      <small>{modo.estrategia === "permitir" ? "LyKari y el teléfono siguen disponibles. Sin selección, solo esas apps quedan permitidas." : "Sin selección no se bloquean apps por este modo."}</small>
      <Aviso error={consulta.error} reintentar={() => void consulta.recargar()} />
      {consulta.datos && <SelectorApps apps={consulta.datos} valor={modo.apps} onChange={(apps) => setModo({ ...modo, apps })} />}
      {!!reglas.webs.length && <fieldset><legend>Reglas web durante el modo</legend>{reglas.webs.map((w) => <Interruptor key={w.id} titulo={w.valor} valor={modo.webs.includes(w.id)} onChange={(si) => setModo({ ...modo, webs: si ? [...modo.webs, w.id] : modo.webs.filter((id) => id !== w.id) })} />)}</fieldset>}
      <Interruptor titulo="Modo activo" valor={modo.activo} onChange={(activo) => setModo({ ...modo, activo })} />
    </fieldset>
    <EstadoAccion accion={accion} /><Guardar ocupado={accion.ocupado} />
    {existe && <button className="ct-btn" type="button" disabled={accion.ocupado} onClick={() => void accion.ejecutar(() => guardar(true))}><Trash2 size={16} />Eliminar modo</button>}
  </form></Editor>;
}
