import { useState } from "react";
import { LockKeyhole, Shield } from "lucide-react";
import { guardarReglas, leerReglas } from "../../control/almacen";
import { motorControl } from "../../control/servicio";
import { EstadoAccion, Titulo, useAccion, type PropsReglas } from "./comun";
import { ConfirmarContrasena } from "./ConfirmarContrasena";

export function Proteccion({ reglas }: PropsReglas) {
  const [confirmando, setConfirmando] = useState(false);
  const accion = useAccion();
  const cambiar = async (activa: boolean) => {
    const actuales = await leerReglas();
    await motorControl().activarProteccion({ activa });
    await guardarReglas({ ...actuales, proteccion: { activa, desde: activa ? Date.now() : null } });
  };
  return <><Titulo titulo="Protección" detalle="Administración del dispositivo y accesibilidad para proteger la app y sus permisos." />
    <div className="ct-card ct-lista"><div className="ct-fila"><Shield size={22} /><h3>{reglas.proteccion.activa ? "Protección activa" : "Protección inactiva"}</h3></div>
      <p>Con la protección activa, se bloquea la desinstalación y la retirada de permisos. Para desactivarla, vuelve a ingresar la contraseña de Zamly.</p>
      {reglas.proteccion.activa && reglas.proteccion.desde !== null && <small>Desde {new Date(reglas.proteccion.desde).toLocaleString("es-PE")}</small>}
      <button className="ct-btn" disabled={accion.ocupado} onClick={() => reglas.proteccion.activa ? setConfirmando(true) : void accion.ejecutar(() => cambiar(true))}><LockKeyhole size={16} />{reglas.proteccion.activa ? "Desactivar protección" : "Activar protección"}</button>
      <EstadoAccion accion={accion} />
    </div>
    {confirmando && <ConfirmarContrasena titulo="Desactivar protección" detalle="Se permitirá desinstalar la app y retirar sus permisos." confirmar="Desactivar protección" onConfirmar={() => cambiar(false)} onClose={() => setConfirmando(false)} />}
  </>;
}
