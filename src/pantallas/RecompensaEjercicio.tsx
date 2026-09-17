import { useEffect, useState } from "react";
import { Dumbbell, LockKeyhole } from "lucide-react";
import { leerReglas } from "../control/almacen";
import { motorControl } from "../control/servicio";
import type { AppInstalada } from "../control/tipos";
import { Hoja } from "../ui/piezas";

export function RecompensaEjercicio({ sesionId, onClose }: { sesionId: number; onClose: () => void }) {
  const [apps, setApps] = useState<AppInstalada[]>([]);
  const [mensaje, setMensaje] = useState("Cargando apps…");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [reglas, instaladas] = await Promise.all([leerReglas(), motorControl().listarApps()]);
        const elegidas = instaladas.apps.filter((a) => reglas.puertaEstudio.apps.includes(a.paquete));
        setApps(elegidas);
        setMensaje(elegidas.length ? "Elige una sola app para tus 15 min." : "No hay apps configuradas en la puerta de estudio.");
      } catch {
        setMensaje("No se pudieron cargar las apps de la puerta.");
      }
    })();
  }, []);

  const conceder = async (paquete: string) => {
    setOcupado(true);
    try {
      const r = await motorControl().registrarDesbloqueoEstudio({ paquete, origen: "ejercicio", sesionId });
      setMensaje(r.concedido ? "15 minutos listos para esa app." : "No se pudo abrir: ya usaste el máximo o el premio de ejercicio de hoy.");
      if (r.concedido) setApps([]);
    } catch {
      setMensaje("No se pudo registrar el acceso. Inténtalo desde la puerta de estudio.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Hoja titulo="Después del ejercicio" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="card" style={{ padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Dumbbell size={19} color="var(--pino)" />
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45 }}>Rutina completa y más de 40 min activos registrados. Este premio solo se puede usar una vez hoy y cuenta dentro del máximo diario de 30 min.</p>
        </div>
        <p role="status" style={{ margin: 0, color: "var(--ink2)", fontSize: 13 }}>{mensaje}</p>
        {apps.map((app) => (
          <button key={app.paquete} className="btn card" disabled={ocupado} onClick={() => void conceder(app.paquete)}
            style={{ padding: "13px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
            <span>{app.nombre}</span><LockKeyhole size={17} color="var(--pino)" />
          </button>
        ))}
      </div>
    </Hoja>
  );
}
