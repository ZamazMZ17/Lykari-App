import { useCallback, useEffect, useRef, useState, type ReactNode, type DependencyList } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, Smartphone } from "lucide-react";
import type { AppInstalada, DiaSemana, ReglasControl } from "../../control/tipos";
import { useAlVolver, useAtras } from "../../lib/ganchos";

export interface PropsReglas { reglas: ReglasControl; }

export function useConsulta<T>(cargar: () => Promise<T>, dependencias: DependencyList = []) {
  const [estado, setEstado] = useState<{ datos?: T; error: string; cargando: boolean }>({ error: "", cargando: true });
  const secuencia = useRef(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const recargar = useCallback(async () => {
    const turno = ++secuencia.current;
    setEstado((anterior) => ({ ...anterior, error: "", cargando: true }));
    try {
      const datos = await cargarRef.current();
      if (turno === secuencia.current) setEstado({ datos, error: "", cargando: false });
    } catch (e) {
      if (turno === secuencia.current) setEstado((anterior) => ({
        ...anterior, cargando: false, error: e instanceof Error ? e.message : "No se pudo leer Control. Intenta de nuevo.",
      }));
    }
  }, []);
  useEffect(() => {
    void recargar();
    return () => { secuencia.current++; };
    // La consulta se renueva al cambiar el periodo solicitado.
  }, [recargar, ...dependencias]);
  useAlVolver(() => void recargar());
  return { ...estado, recargar };
}

export function useAccion() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const ejecutando = useRef(false);
  const ejecutar = async (accion: () => Promise<void>) => {
    if (ejecutando.current) return;
    ejecutando.current = true;
    setOcupado(true); setError(""); setMensaje("");
    try { await accion(); setMensaje("Cambios guardados."); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo."); }
    finally { ejecutando.current = false; setOcupado(false); }
  };
  return { ocupado, error, mensaje, ejecutar };
}

export function Aviso({ error, reintentar }: { error: string; reintentar?: () => void }) {
  return error ? <div className="ct-aviso" role="alert"><p>{error}</p>{reintentar && <button className="ct-btn" onClick={reintentar}>Reintentar</button>}</div> : null;
}

export function EstadoAccion({ accion }: { accion: ReturnType<typeof useAccion> }) {
  return <><Aviso error={accion.error} />{accion.mensaje && <p role="status">{accion.mensaje}</p>}</>;
}

export function Titulo({ titulo, detalle }: { titulo: string; detalle: string }) {
  return <header className="ct-titulo"><h2 className="disp">{titulo}</h2><p>{detalle}</p></header>;
}

export function Vacio({ children }: { children: ReactNode }) { return <p className="ct-vacio">{children}</p>; }

const dias: [DiaSemana, string, string][] = [[1, "L", "Lunes"], [2, "M", "Martes"], [3, "X", "Miércoles"], [4, "J", "Jueves"], [5, "V", "Viernes"], [6, "S", "Sábado"], [0, "D", "Domingo"]];
export function Dias({ valor, onChange }: { valor: DiaSemana[]; onChange: (dias: DiaSemana[]) => void }) {
  return <fieldset className="ct-dias"><legend>Días de la semana</legend><div className="ct-fila">{dias.map(([dia, letra, nombre]) =>
    <button type="button" className="ct-btn" key={dia} aria-label={nombre} aria-pressed={valor.length === 0 || valor.includes(dia)} onClick={() => {
      const seleccion = valor.length ? valor : dias.map(([d]) => d);
      const nueva = seleccion.includes(dia) ? seleccion.filter((d) => d !== dia) : [...seleccion, dia];
      // Un único día no se puede quitar: [] significa todos en el contrato.
      if (nueva.length) onChange(nueva.length === 7 ? [] : nueva);
    }}>{letra}</button>)}</div><small>Selecciona al menos un día. Todos seleccionados = todos los días.</small></fieldset>;
}

export function Interruptor({ titulo, valor, onChange, disabled }: { titulo: string; valor: boolean; onChange: (valor: boolean) => void; disabled?: boolean }) {
  return <label className="ct-check"><input type="checkbox" checked={valor} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /><span>{titulo}</span></label>;
}

export function IconoApp({ app }: { app?: AppInstalada }) {
  return <span className="ct-icono">{app?.iconoBase64 ? <img alt="" src={"data:image/png;base64," + app.iconoBase64} /> : <Smartphone size={19} />}</span>;
}

export function SelectorApps({ apps, valor, onChange }: { apps: AppInstalada[]; valor: string[]; onChange: (valor: string[]) => void }) {
  const [buscar, setBuscar] = useState("");
  const opciones = [...apps, ...valor.filter((p) => !apps.some((a) => a.paquete === p)).map((paquete) => ({ paquete, nombre: paquete, categoria: "otra", esSistema: false }))];
  return <div className="ct-selector"><label>Buscar en aplicaciones<input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} /></label>
    <div className="ct-selector-lista">{opciones.filter((a) => (a.nombre + a.paquete).toLowerCase().includes(buscar.toLowerCase())).map((a) =>
      <Interruptor key={a.paquete} titulo={a.nombre} valor={valor.includes(a.paquete)} onChange={(si) => onChange(si ? [...valor, a.paquete] : valor.filter((p) => p !== a.paquete))} />)}</div>
    <small>{valor.length} seleccionadas</small></div>;
}

/** Una hoja modal nativa mantiene el foco sin anidar el historial de la hoja Zamly. */
export function Editor({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const elemento = dialogo.current!;
    const anterior = document.activeElement as HTMLElement | null;
    elemento.showModal();
    return () => { elemento.close(); anterior?.focus(); };
  }, []);
  useAtras(true, onClose);
  return createPortal(<dialog ref={dialogo} className="control-ui ct-editor" aria-label={titulo} onCancel={(e) => { e.preventDefault(); onClose(); }}>
    <div className="ct-fila"><button type="button" className="ct-btn" onClick={onClose}><ChevronLeft size={17} /> Volver</button><h2 className="disp">{titulo}</h2></div>
    {children}
  </dialog>, document.body);
}

export function Guardar({ ocupado }: { ocupado: boolean }) {
  return <button className="ct-btn ct-primario" type="submit" disabled={ocupado}><Check size={17} />{ocupado ? "Guardando…" : "Guardar cambios"}</button>;
}
