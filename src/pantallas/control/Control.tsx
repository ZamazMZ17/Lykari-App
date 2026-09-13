import { useEffect, useState } from "react";
import { LayoutDashboard, Smartphone, Globe, Clock3, ShieldCheck, History, LockKeyhole } from "lucide-react";
import { esNativo } from "../../lib/plataforma";
import { guardarReglas, leerReglas, useReglas } from "../../control/almacen";
import { prepararMock } from "../../control/mock";
import { motorControl, usaMock } from "../../control/servicio";
import { sincronizarUso } from "../../control/historial";
import { ESPERA_APAGAR_ADULTO_MS } from "../../control/tipos";
import { Apps } from "./Apps";
import { Webs } from "./Webs";
import { Modos } from "./Modos";
import { FiltroAdulto } from "./FiltroAdulto";
import { Historial } from "./Historial";
import { Proteccion } from "./Proteccion";
import { Permisos } from "./Permisos";
import { Resumen } from "./Resumen";
import { Aviso, useConsulta, Vacio } from "./comun";
import "./control.css";

const secciones = [
  ["Resumen", LayoutDashboard], ["Apps", Smartphone], ["Webs", Globe], ["Modos", Clock3],
  ["+18", ShieldCheck], ["Historial", History], ["Protección", LockKeyhole],
] as const;
type Seccion = typeof secciones[number][0];

/** Se monta dentro del acceso autenticado de Zamly, sin otra hoja exterior. */
export function Control() {
  if (!esNativo && !usaMock()) return <div className="control-ui"><Vacio>Disponible solo en el APK</Vacio></div>;
  return <ControlDisponible />;
}

function ControlDisponible() {
  const [preparado, setPreparado] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let vigente = true;
    void (usaMock() ? prepararMock() : Promise.resolve()).then(() => { if (vigente) setPreparado(true); })
      .catch(() => { if (vigente) setError("No se pudo preparar el almacenamiento de Control."); });
    return () => { vigente = false; };
  }, []);
  const permisos = useConsulta(() => motorControl().estadoPermisos());
  if (!preparado || !permisos.datos) return <div className="control-ui"><Aviso error={error || permisos.error} reintentar={() => void permisos.recargar()} />{!error && !permisos.error && <Vacio>Preparando Control…</Vacio>}</div>;
  if (Object.values(permisos.datos).some((p) => !p)) return <div className="control-ui"><Aviso error={permisos.error} /><Permisos estado={permisos.datos} recargar={permisos.recargar} /></div>;
  return <div className="control-ui">{usaMock() && <p className="eyebrow">Demostración · datos de prueba</p>}
    <Aviso error={permisos.error} reintentar={() => void permisos.recargar()} /><ContenidoControl />
  </div>;
}

function ContenidoControl() {
  const estado = useReglas();
  const [seccion, setSeccion] = useState<Seccion>("Resumen");
  const [errorApagado, setErrorApagado] = useState("");
  const [reintento, setReintento] = useState(0);
  const sincronizacion = useConsulta(sincronizarUso);
  const pedido = estado?.reglas?.filtroAdulto.apagadoPedidoEn;
  const activo = estado?.reglas?.filtroAdulto.activo;

  useEffect(() => {
    if (!activo || pedido == null) return;
    // Android debe aplicar el mismo vencimiento con la app cerrada. Aquí se actualiza su espejo local.
    let vigente = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const actuales = await leerReglas();
        const filtro = actuales.filtroAdulto;
        if (filtro.activo && filtro.apagadoPedidoEn !== null && Date.now() >= filtro.apagadoPedidoEn + ESPERA_APAGAR_ADULTO_MS) {
          await guardarReglas({ ...actuales, filtroAdulto: { ...filtro, activo: false, apagadoPedidoEn: null } });
        }
        if (vigente) setErrorApagado("");
      })().catch(() => { if (vigente) setErrorApagado("La espera terminó, pero no se pudo sincronizar el apagado. Reintenta."); });
    }, Math.max(0, pedido + ESPERA_APAGAR_ADULTO_MS - Date.now()));
    return () => { vigente = false; window.clearTimeout(timer); };
  }, [pedido, activo, reintento]);

  const reglas = estado?.reglas;
  if (!reglas) return <><Aviso error={estado?.error ?? ""} /><Vacio>Leyendo reglas…</Vacio></>;
  return <>
    <nav className="ct-nav" aria-label="Secciones de Control">{secciones.map(([nombre, Icono]) => <button key={nombre} className="ct-btn" aria-pressed={seccion === nombre} onClick={() => setSeccion(nombre)}><Icono size={15} />{nombre}</button>)}</nav>
    <Aviso error={sincronizacion.error} reintentar={() => void sincronizacion.recargar()} />
    <Aviso error={errorApagado} reintentar={() => setReintento((n) => n + 1)} />
    {seccion === "Resumen" && <Resumen reglas={reglas} />}
    {seccion === "Apps" && <Apps reglas={reglas} />}
    {seccion === "Webs" && <Webs reglas={reglas} />}
    {seccion === "Modos" && <Modos reglas={reglas} />}
    {seccion === "+18" && <FiltroAdulto reglas={reglas} />}
    {seccion === "Historial" && <Historial />}
    {seccion === "Protección" && <Proteccion reglas={reglas} />}
  </>;
}
