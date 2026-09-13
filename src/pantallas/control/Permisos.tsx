import { useEffect } from "react";
import { Check, Settings } from "lucide-react";
import type { EstadoPermisos, TipoPermiso } from "../../control/tipos";
import { motorControl } from "../../control/servicio";
import { Aviso, Titulo, useAccion } from "./comun";

const permisos: [TipoPermiso, string, string, boolean][] = [
  ["uso", "Acceso al uso", "Lee el tiempo y las aperturas de cada aplicación.", true],
  ["accesibilidad", "Accesibilidad", "Aplica límites y reconoce los sitios compatibles.", true],
  ["admin", "Administración del dispositivo", "Sostiene la protección contra desinstalación.", false],
  ["superposicion", "Mostrar sobre otras apps", "Muestra la pantalla al alcanzar un límite.", false],
  ["vpn", "Filtro DNS", "Filtra dominios con una conexión VPN local (filtro +18).", false],
  ["notificaciones", "Notificaciones", "Muestra los avisos del servicio de Control.", false],
];

export function Permisos({ estado, recargar }: { estado: EstadoPermisos; recargar: () => Promise<void> }) {
  const accion = useAccion();
  // Al volver de la pantalla de Ajustes de Android, revisar solo qué se concedió.
  // Sin esto parecía que "no dejaba": el permiso se daba pero la app no lo releía.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === "visible") void recargar(); };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [recargar]);
  return <><Titulo titulo="Permisos de Control" detalle="Los dos primeros son imprescindibles. Administración, superposición y filtro DNS solo hacen falta para la protección y el +18: puedes usar el resto sin ellos. Se revisan solos al volver de Ajustes." />
    <div className="ct-lista">{permisos.map(([tipo, nombre, detalle, esencial]) => <div className="ct-card" key={tipo}>
      <div className="ct-fila"><div className="ct-crece"><h3>{nombre} {esencial ? <small>· imprescindible</small> : <small>· opcional</small>}</h3><p>{detalle}</p></div>{estado[tipo] && <Check size={19} aria-label="Concedido" />}</div>
      <button className="ct-btn" disabled={accion.ocupado} onClick={() => void accion.ejecutar(async () => {
        await motorControl().abrirAjustesPermiso({ tipo }); await recargar();
      })}><Settings size={15} />{estado[tipo] ? "Revisar acceso" : "Abrir ajustes"}</button>
    </div>)}</div><Aviso error={accion.error} /><button className="ct-btn" onClick={() => void recargar()}>Revisar permisos</button></>;
}
