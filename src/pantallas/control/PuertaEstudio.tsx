import { useState } from "react";
import { guardarReglas } from "../../control/almacen";
import type { PuertaEstudio as ConfigPuerta } from "../../control/tipos";
import {
  EstadoAccion,
  Guardar,
  Interruptor,
  SelectorApps,
  Titulo,
  useAccion,
  useConsulta,
  type PropsReglas,
} from "./comun";
import { motorControl } from "../../control/servicio";

export function PuertaEstudio({ reglas }: PropsReglas) {
  const pe = reglas.puertaEstudio;
  const [activa, setActiva] = useState(pe.activa);
  const [apps, setApps] = useState(pe.apps);
  const accion = useAccion();
  const listaApps = useConsulta(() => motorControl().listarApps());

  const guardar = async () => {
    const nueva: ConfigPuerta = {
      activa,
      // WhatsApp queda siempre fuera de la puerta, incluso si una configuración
      // vieja lo hubiera guardado por accidente.
      apps: apps.filter((p) => p !== "com.whatsapp" && p !== "com.whatsapp.w4b"),
    };
    await guardarReglas({ ...reglas, puertaEstudio: nueva, actualizado: Date.now() });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void accion.ejecutar(guardar);
      }}
    >
      <Titulo
        titulo="Puerta de estudio"
        detalle="Cada acceso requiere 12 preguntas y 10 aciertos. Un aprobado abre solo una app por 15 min; el máximo diario es 30 min."
      />

      <Interruptor titulo="Activar puerta de estudio" valor={activa} onChange={setActiva} />

      {activa && (
        <>
          <fieldset style={{ marginTop: 16 }}>
            <legend className="eyebrow" style={{ marginBottom: 8 }}>
              Apps que requieren estudio
            </legend>
            {listaApps.datos && (
              <SelectorApps
                apps={listaApps.datos.apps.filter((a) => a.paquete !== "com.whatsapp" && a.paquete !== "com.whatsapp.w4b")}
                valor={apps}
                onChange={setApps}
              />
            )}
          </fieldset>
        </>
      )}

      <EstadoAccion accion={accion} />
      <Guardar ocupado={accion.ocupado} />
    </form>
  );
}
