import { useEffect, useState } from "react";
import { ChevronRight, LockKeyhole, Search, Timer } from "lucide-react";
import { guardarReglas, leerReglas } from "../../control/almacen";
import { motorControl } from "../../control/servicio";
import { diaLocal, desplazarDia, duracion, sumarUso } from "../../control/presentacion";
import type { AppInstalada, LimiteApp, ReglasControl } from "../../control/tipos";
import { guardarAjuste, leerAjuste } from "../../ia/ajustes";
import { Aviso, Dias, Editor, EstadoAccion, Guardar, IconoApp, Interruptor, Titulo, useAccion, useConsulta, Vacio, type PropsReglas } from "./comun";
import { ConfirmarContrasena } from "./ConfirmarContrasena";

const CLAVE_RELAX = "controlRelajacionesPendientes";
const ESPERA_RELAX_MS = 24 * 60 * 60 * 1000;

type RelajacionPendiente = { paquete: string; nombre: string; limite: LimiteApp | null; solicitadaEn: number };

async function leerRelajaciones(): Promise<RelajacionPendiente[]> {
  try {
    const valor = await leerAjuste(CLAVE_RELAX);
    const lista = valor ? JSON.parse(valor) : [];
    return Array.isArray(lista) ? lista.filter((r): r is RelajacionPendiente => r && typeof r.paquete === "string" && typeof r.solicitadaEn === "number") : [];
  } catch { return []; }
}

async function guardarRelajaciones(lista: RelajacionPendiente[]): Promise<void> {
  await guardarAjuste(CLAVE_RELAX, JSON.stringify(lista));
}

/** Solo endurecer aplica de inmediato. Relajar una regla tiene contraseña y 24 h de espera. */
function esRelajacion(anterior: LimiteApp | undefined, siguiente: LimiteApp | null): boolean {
  if (!anterior?.activo) return false;
  if (!siguiente || !siguiente.activo) return true;
  if (siguiente.minutosDia > anterior.minutosDia) return true;
  const aperturasAntes = anterior.aperturasDia ?? Infinity;
  const aperturasDespues = siguiente.aperturasDia ?? Infinity;
  if (aperturasDespues > aperturasAntes) return true;
  return ([0, 1, 2, 3, 4, 5, 6] as const).some((dia) =>
    (anterior.dias.length === 0 || anterior.dias.includes(dia)) && !(siguiente.dias.length === 0 || siguiente.dias.includes(dia)));
}

async function aplicarRelajacionesVencidas(): Promise<RelajacionPendiente[]> {
  const pendientes = await leerRelajaciones();
  const vigentes = pendientes.filter((p) => p.solicitadaEn + ESPERA_RELAX_MS > Date.now());
  const vencidas = pendientes.filter((p) => !vigentes.includes(p));
  for (const cambio of vencidas) {
    const actuales = await leerReglas();
    await guardarReglas({ ...actuales, limites: [...actuales.limites.filter((l) => l.paquete !== cambio.paquete), ...(cambio.limite ? [cambio.limite] : [])] });
  }
  if (vencidas.length) await guardarRelajaciones(vigentes);
  return vigentes;
}

export function Apps({ reglas }: PropsReglas) {
  const [buscar, setBuscar] = useState("");
  const [edicion, setEdicion] = useState<{ app: AppInstalada; reglas: ReglasControl }>();
  const [pendientes, setPendientes] = useState<RelajacionPendiente[]>([]);
  const [confirmando, setConfirmando] = useState<RelajacionPendiente>();
  const [error, setError] = useState("");
  useEffect(() => {
    void aplicarRelajacionesVencidas().then(setPendientes).catch(() => setError("No se pudo revisar los cambios protegidos."));
  }, []);
  const consulta = useConsulta(async () => {
    const hoy = diaLocal();
    const [apps, uso] = await Promise.all([motorControl().listarApps(), motorControl().usoRango({ desde: desplazarDia(hoy, -6), hasta: hoy })]);
    const totales = sumarUso(uso.dias.flatMap((d) => d.apps));
    return apps.apps.map((app) => ({ app, uso: totales.find((u) => u.paquete === app.paquete)?.ms ?? 0 }))
      .sort((a, b) => b.uso - a.uso || a.app.nombre.localeCompare(b.app.nombre));
  });
  const lista = consulta.datos?.filter(({ app }) => (app.nombre + " " + app.paquete).toLowerCase().includes(buscar.toLowerCase()));
  return <><Titulo titulo="Apps" detalle="Ordenadas por tiempo registrado en los últimos 7 días, incluido hoy." />
    <Aviso error={error} />
    {pendientes.map((cambio) => <div className="ct-aviso" key={cambio.paquete}><p className="ct-fila"><Timer size={16} />Cambio protegido para {cambio.nombre}</p><small>El límite actual sigue activo. El cambio solicitado se aplicará después de {new Date(cambio.solicitadaEn + ESPERA_RELAX_MS).toLocaleString("es-PE")}.</small></div>)}
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
    {edicion && <EditarApp app={edicion.app} reglas={edicion.reglas} onClose={() => setEdicion(undefined)} onSolicitarRelajacion={(limite) => { setEdicion(undefined); setConfirmando({ paquete: edicion.app.paquete, nombre: edicion.app.nombre, limite, solicitadaEn: Date.now() }); }} />}
    {confirmando && <ConfirmarContrasena titulo="Solicitar cambio protegido" detalle={`El límite actual de ${confirmando.nombre} se mantiene durante 24 horas. Esta espera existe para que un impulso no cambie el acuerdo que hiciste contigo.`} confirmar="Iniciar espera de 24 h" onConfirmar={async () => {
      const existentes = await leerRelajaciones();
      const nuevos = [...existentes.filter((p) => p.paquete !== confirmando.paquete), confirmando];
      await guardarRelajaciones(nuevos);
      setPendientes(nuevos);
    }} onClose={() => setConfirmando(undefined)} />}
  </>;
}

function EditarApp({ app, reglas, onClose, onSolicitarRelajacion }: PropsReglas & { app: AppInstalada; onClose: () => void; onSolicitarRelajacion: (limite: LimiteApp | null) => void }) {
  const anterior = reglas.limites.find((l) => l.paquete === app.paquete);
  const [limite, setLimite] = useState<LimiteApp>(anterior ?? { paquete: app.paquete, minutosDia: 60, dias: [], activo: true });
  const accion = useAccion();
  const guardar = async (borrar = false) => {
    await guardarReglas({ ...reglas, limites: [...reglas.limites.filter((l) => l.paquete !== app.paquete), ...(borrar ? [] : [limite])] });
    onClose();
  };
  const enviar = () => {
    if (esRelajacion(anterior, limite)) { onSolicitarRelajacion(limite); return; }
    void accion.ejecutar(() => guardar());
  };
  const eliminar = () => {
    if (esRelajacion(anterior, null)) { onSolicitarRelajacion(null); return; }
    void accion.ejecutar(() => guardar(true));
  };
  return <Editor titulo={app.nombre} onClose={onClose}><form className="ct-form" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
    <fieldset disabled={accion.ocupado}>
      <label>Minutos por día<input type="number" required min="0" max="1440" step="1" value={limite.minutosDia} onChange={(e) => setLimite({ ...limite, minutosDia: e.target.valueAsNumber })} /></label>
      <small>0 minutos bloquea la aplicación todo el día.</small>
      <label>Aperturas por día (opcional)<input type="number" min="0" step="1" value={limite.aperturasDia ?? ""} onChange={(e) => setLimite({ ...limite, aperturasDia: e.target.value === "" ? undefined : e.target.valueAsNumber })} /></label>
      <Dias valor={limite.dias} onChange={(dias) => setLimite({ ...limite, dias })} />
      <Interruptor titulo="Límite activo" valor={limite.activo} onChange={(activo) => setLimite({ ...limite, activo })} />
    </fieldset>
    <EstadoAccion accion={accion} /><Guardar ocupado={accion.ocupado} />
    {anterior && <button type="button" className="ct-btn" disabled={accion.ocupado} onClick={eliminar}><LockKeyhole size={16} />Eliminar límite</button>}
  </form></Editor>;
}
