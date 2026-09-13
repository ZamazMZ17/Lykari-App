import { useState } from "react";
import { ShieldCheck, Timer } from "lucide-react";
import { guardarReglas, leerReglas } from "../../control/almacen";
import { motorControl } from "../../control/servicio";
import { normalizarDominio } from "../../control/presentacion";
import { ESPERA_APAGAR_ADULTO_MS, type FiltroAdulto as Filtro, type ReglasControl } from "../../control/tipos";
import { useTic } from "../../lib/ganchos";
import { Aviso, Editor, EstadoAccion, Guardar, Interruptor, Titulo, useAccion, useConsulta, type PropsReglas } from "./comun";
import { ConfirmarContrasena } from "./ConfirmarContrasena";

const listas: [keyof Pick<Filtro, "palabras" | "dominios" | "chatsBloqueados" | "navegadoresPermitidos">, string][] = [
  ["palabras", "Palabras propias"], ["dominios", "Dominios bloqueados"],
  ["chatsBloqueados", "Chats de Telegram bloqueados"], ["navegadoresPermitidos", "Navegadores permitidos"],
];

export function FiltroAdulto({ reglas }: PropsReglas) {
  const filtro = reglas.filtroAdulto;
  const [edicion, setEdicion] = useState<ReglasControl>();
  const [confirmando, setConfirmando] = useState(false);
  const accion = useAccion();
  const ahora = useTic(filtro.apagadoPedidoEn !== null);
  const consulta = useConsulta(async () => (await motorControl().intentos()).intentos.filter((i) => i.motivo === "adulto"));
  const restante = filtro.apagadoPedidoEn === null ? null : Math.max(0, filtro.apagadoPedidoEn + ESPERA_APAGAR_ADULTO_MS - ahora);
  const segundos = restante === null ? 0 : Math.ceil(restante / 1000);
  const reloj = [Math.floor(segundos / 3600), Math.floor(segundos / 60) % 60, segundos % 60].map((n) => String(n).padStart(2, "0")).join(":");
  const cambiar = async (cambios: Partial<Filtro>) => {
    const actuales = await leerReglas();
    await guardarReglas({ ...actuales, filtroAdulto: { ...actuales.filtroAdulto, ...cambios } });
  };
  return <><Titulo titulo="Filtro +18" detalle="DNS familiar, lista local y detección en navegadores y Telegram. No admite extensiones." />
    <div className="ct-lista">
      <div className="ct-card"><h3 className="ct-fila"><ShieldCheck size={20} />{filtro.activo ? "Filtro activo" : "Filtro inactivo"}</h3>
        <p>Capas configuradas; el motor Android aplica el filtro.</p>
        <p>DNS familiar: {filtro.dns ? "activado" : "desactivado"}<br />Lista local: incluida en el APK<br />SafeSearch: {filtro.forzarSafeSearch ? "forzado" : "sin forzar"}<br />Búsqueda en Telegram: {filtro.bloquearBusquedaTelegram ? "bloqueada" : "permitida"}<br />Puertas (catálogos de canales, grupos, subreddits NSFW): {filtro.bloquearPuertas ? "bloqueadas" : "permitidas"}<br />Marcas de contenido sensible: {filtro.etiquetasSensibles ? "bloquean" : "se ignoran"}<br />Apps vigiladas: {filtro.appsVigiladas.length}</p>
        {listas.map(([clave, titulo]) => <div key={clave}><h3>{titulo} · {filtro[clave].length}</h3><p>{filtro[clave].join(" · ") || "Sin elementos propios."}</p></div>)}
        <button className="ct-btn" onClick={() => setEdicion(reglas)}>Configurar capas y listas</button>
      </div>
      <div className="ct-card"><h3>Intentos bloqueados</h3><Aviso error={consulta.error} reintentar={() => void consulta.recargar()} />
        {consulta.datos ? <><span className="ct-numero ct-total">{consulta.datos.length}</span><p>Registros disponibles del filtro +18.</p>{consulta.datos.slice().sort((a, b) => b.fecha - a.fecha).slice(0, 10).map((i, n) => <p key={n}><span className="ct-numero">{new Date(i.fecha).toLocaleString("es-PE")}</span><br />{i.origen}</p>)}</> : <p>Leyendo intentos…</p>}
        <small>Solo dominio o paquete y hora; nunca URLs completas ni texto de chats.</small>
      </div>
      {filtro.activo && restante !== null ? <div className="ct-card"><h3 className="ct-fila"><Timer size={18} />Apagado solicitado</h3><div className="ct-numero ct-total ct-corriendo">{reloj}</div>
        <p>Se apagará el {new Date(filtro.apagadoPedidoEn! + ESPERA_APAGAR_ADULTO_MS).toLocaleString("es-PE")}. El filtro sigue activo durante la espera.</p>
        <button className="ct-btn" disabled={accion.ocupado} onClick={() => void accion.ejecutar(() => cambiar({ apagadoPedidoEn: null }))}>Cancelar apagado</button>
      </div> : <button className="ct-btn ct-primario" disabled={accion.ocupado} onClick={() => filtro.activo ? setConfirmando(true) : void accion.ejecutar(() => cambiar({ activo: true, apagadoPedidoEn: null }))}>{filtro.activo ? "Solicitar apagado en 24 h" : "Activar filtro"}</button>}
      <EstadoAccion accion={accion} />
    </div>
    {edicion && <EditarFiltro reglas={edicion} onClose={() => setEdicion(undefined)} />}
    {confirmando && <ConfirmarContrasena titulo="Solicitar apagado" detalle="Confirma con tu contraseña. El filtro permanece activo durante 24 horas y se apaga al terminar la espera." confirmar="Iniciar espera de 24 h" onClose={() => setConfirmando(false)} onConfirmar={async () => {
      const actuales = await leerReglas();
      if (actuales.filtroAdulto.apagadoPedidoEn !== null) throw new Error("Ya hay una solicitud de apagado.");
      await guardarReglas({ ...actuales, filtroAdulto: { ...actuales.filtroAdulto, apagadoPedidoEn: Date.now() } });
    }} />}
  </>;
}

function EditarFiltro({ reglas, onClose }: PropsReglas & { onClose: () => void }) {
  const original = reglas.filtroAdulto;
  const [filtro, setFiltro] = useState(original);
  const [textos, setTextos] = useState(Object.fromEntries(listas.map(([clave]) => [clave, original[clave].join("\n")])) as Record<typeof listas[number][0], string>);
  const accion = useAccion();
  return <Editor titulo="Capas y listas del filtro" onClose={onClose}><form className="ct-form" onSubmit={(e) => {
    e.preventDefault();
    void accion.ejecutar(async () => {
      const nuevo = { ...filtro };
      for (const [clave] of listas) {
        nuevo[clave] = [...new Set(textos[clave].split("\n").map((v) => v.trim()).filter(Boolean).map((v) =>
          clave === "dominios" ? normalizarDominio(v) : clave === "chatsBloqueados" ? v : v.toLowerCase()))];
      }
      if (nuevo.navegadoresPermitidos.some((p) => !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(p))) throw new Error("Cada navegador debe indicarse con su paquete, por ejemplo com.android.chrome.");
      await guardarReglas({ ...reglas, filtroAdulto: nuevo }); onClose();
    });
  }}>
    {original.activo && <p>Con el filtro activo puedes añadir bloqueos y reforzar capas. Para retirar restricciones, solicita el apagado y espera 24 h.</p>}
    <fieldset disabled={accion.ocupado}>
      <Interruptor titulo="DNS familiar" valor={filtro.dns} disabled={original.activo && original.dns} onChange={(dns) => setFiltro({ ...filtro, dns })} />
      <Interruptor titulo="Forzar SafeSearch" valor={filtro.forzarSafeSearch} disabled={original.activo && original.forzarSafeSearch} onChange={(forzarSafeSearch) => setFiltro({ ...filtro, forzarSafeSearch })} />
      <Interruptor titulo="Bloquear búsqueda en Telegram" valor={filtro.bloquearBusquedaTelegram} disabled={original.activo && original.bloquearBusquedaTelegram} onChange={(bloquearBusquedaTelegram) => setFiltro({ ...filtro, bloquearBusquedaTelegram })} />
      <Interruptor titulo="Bloquear puertas (catálogos de canales, grupos, subreddits NSFW)" valor={filtro.bloquearPuertas} disabled={original.activo && original.bloquearPuertas} onChange={(bloquearPuertas) => setFiltro({ ...filtro, bloquearPuertas })} />
      <Interruptor titulo="Bloquear marcas de contenido sensible (Telegram, Reddit, X…)" valor={filtro.etiquetasSensibles} disabled={original.activo && original.etiquetasSensibles} onChange={(etiquetasSensibles) => setFiltro({ ...filtro, etiquetasSensibles })} />
      {listas.map(([clave, titulo]) => <label key={clave}>{titulo}<textarea value={textos[clave]} onChange={(e) => setTextos({ ...textos, [clave]: e.target.value })} /><small>{clave === "navegadoresPermitidos" ? "Un paquete por línea. Solo navegadores compatibles con lectura de URL." : "Un elemento por línea."}</small></label>)}
    </fieldset><EstadoAccion accion={accion} /><Guardar ocupado={accion.ocupado} />
  </form></Editor>;
}
