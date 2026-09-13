import { Check, Settings } from "lucide-react";
import type { EstadoPermisos, TipoPermiso } from "../../control/tipos";
import { motorControl } from "../../control/servicio";
import { Aviso, Titulo, useAccion } from "./comun";

const permisos: [TipoPermiso, string, string][] = [
  ["uso", "Acceso al uso", "Lee el tiempo y las aperturas de cada aplicación."],
  ["accesibilidad", "Accesibilidad", "Aplica límites y reconoce los sitios compatibles."],
  ["admin", "Administración del dispositivo", "Sostiene la protección contra desinstalación."],
  ["superposicion", "Mostrar sobre otras apps", "Muestra la pantalla al alcanzar un límite."],
  ["vpn", "Filtro DNS", "Filtra dominios con una conexión VPN local."],
  ["notificaciones", "Notificaciones", "Muestra los avisos del servicio de Control."],
];

export function Permisos({ estado, recargar }: { estado: EstadoPermisos; recargar: () => Promise<void> }) {
  const accion = useAccion();
  return <><Titulo titulo="Permisos de Control" detalle="Activa estos accesos para leer el uso y aplicar las reglas. Se revisan al volver a la app." />
    <div className="ct-lista">{permisos.map(([tipo, nombre, detalle]) => <div className="ct-card" key={tipo}>
      <div className="ct-fila"><div className="ct-crece"><h3>{nombre}</h3><p>{detalle}</p></div>{estado[tipo] && <Check size={19} aria-label="Concedido" />}</div>
      <button className="ct-btn" disabled={accion.ocupado} onClick={() => void accion.ejecutar(async () => {
        await motorControl().abrirAjustesPermiso({ tipo }); await recargar();
      })}><Settings size={15} />{estado[tipo] ? "Revisar acceso" : "Abrir ajustes"}</button>
    </div>)}</div><Aviso error={accion.error} /><button className="ct-btn" onClick={() => void recargar()}>Revisar permisos</button></>;
}
