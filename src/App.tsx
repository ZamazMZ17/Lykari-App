import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Activity, CalendarDays, LayoutGrid, Mic, Pause, Play, Timer } from "lucide-react";

import { db, type Actividad, type Curso, type Sesion } from "./db/db";
import {
  actividadesDelTablon,
  actualizarActividad,
  continuarSesion,
  crearActividad,
  finalizarSesion,
  iniciarSesion,
  pausarSesion,
  reconciliarSesiones,
  resumirDia,
  retirarActividad,
  sesionesDelDia,
  type NuevaActividad as DatosActividad,
} from "./db/acciones";
import {
  actualizarCurso,
  crearCurso,
  cursosActivos,
  eliminarCurso,
  type NuevoCurso as DatosCurso,
} from "./db/cursos";
import {
  capturasDe,
  capturasSinProcesar,
  contarPorTipo,
  tareas as leerTareas,
} from "./db/capturas";
import { hayKey } from "./ia/ajustes";
import { procesarPendientes } from "./ia/procesar";
import { cerrarDiasPendientes, limpiarTareasCaducadas } from "./ia/cierre";
import { reprogramarRecordatorios } from "./notificaciones";
import { hoyISO, msHastaMedianoche } from "./lib/fecha";
import { useAlVolver, useAtras, useDisposicion, useTic } from "./lib/ganchos";
import { LIMITE_ENFOQUE, MINUTO, cronometro, estaPausada, msRegistrados } from "./lib/tiempo";
import { useTema } from "./lib/tema";
import { Hoja } from "./ui/piezas";
import { Hoy } from "./pantallas/Hoy";
import { Sesion as PantallaSesion } from "./pantallas/Sesion";
import { NuevaActividad } from "./pantallas/NuevaActividad";
import { CerrarSesion } from "./pantallas/CerrarSesion";
import { DetalleActividad, DetalleCurso, SesionEnCurso } from "./pantallas/HojasCortas";
import { Camino } from "./pantallas/Camino";
import { Horario } from "./pantallas/Horario";
import { NuevoCurso } from "./pantallas/NuevoCurso";
import { Capturar, type Seccion } from "./pantallas/Capturar";
import { Ideas } from "./pantallas/Ideas";
import { Diario } from "./pantallas/Diario";
import { Pendientes } from "./pantallas/Pendientes";
import { Ajustes } from "./pantallas/Ajustes";
import { HojaMascota } from "./pantallas/HojaMascota";
import { Burbuja } from "./ui/Burbuja";

type Tab = "hoy" | "capturar" | "camino" | "horario";

type HojaAbierta =
  | { t: "nueva" }
  | { t: "cerrar" }
  | { t: "detalle"; act: Actividad }
  | { t: "conflicto"; act: Actividad }
  | { t: "autocierre"; nombres: string[] }
  | { t: "ajustes" }
  | { t: "mascota" }
  | { t: "nuevoCurso" }
  | { t: "detalleCurso"; curso: Curso }
  | null;

const TABS: [Tab, string, typeof LayoutGrid][] = [
  ["hoy", "Hoy", LayoutGrid],
  ["capturar", "Capturar", Mic],
  ["horario", "Horario", CalendarDays],
  ["camino", "Camino", Activity],
];

export default function App() {
  const [tab, setTab] = useState<Tab>("hoy");
  const [enSesion, setEnSesion] = useState(false);
  const [seccion, setSeccion] = useState<Seccion | null>(null);
  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [dia, setDia] = useState(hoyISO);

  // Aplica el tema (claro/oscuro/sistema) y lo mantiene en sync con el sistema.
  useTema();

  /* ── datos ─────────────────────────────────────────────────────── */
  const actividades = useLiveQuery(() => actividadesDelTablon(dia), [dia]);
  const sesiones = useLiveQuery(() => sesionesDelDia(dia), [dia]);
  const abierta = useLiveQuery<Sesion | undefined>(
    () => db.sesiones.where("abierta").equals(1).first(),
    [],
  );
  const actividadAbierta = useLiveQuery(
    () => (abierta ? db.actividades.get(abierta.actividadId) : undefined),
    [abierta?.actividadId],
  );

  const cuentas = useLiveQuery(contarPorTipo, []);
  const tieneKey = useLiveQuery(hayKey, [], false);
  const pendientesIA = useLiveQuery(capturasSinProcesar, [], []);
  const capturasSeccion = useLiveQuery(
    () => (seccion ? capturasDe(seccion.k) : Promise.resolve([])),
    [seccion?.k],
    [],
  );
  const tareas = useLiveQuery(leerTareas, [], []);
  const cursos = useLiveQuery(cursosActivos, [], []);

  const corriendo = !!abierta && !estaPausada(abierta);
  const ahora = useTic(corriendo);
  const amplia = useDisposicion() === "amplia";

  const resumen = useMemo(
    () => resumirDia(sesiones ?? [], ahora),
    [sesiones, ahora],
  );

  /* ── reconciliación: no hay cron, se revisa al abrir y al volver ── */
  const revisar = useCallback(async () => {
    const cerradas = await reconciliarSesiones();
    setDia(hoyISO());
    // Las tareas del cierre que nadie hizo desaparecen solas a los 7 días.
    await limpiarTareasCaducadas();
    await reprogramarRecordatorios();
    if (cerradas.length === 0) return;
    const nombres = await Promise.all(
      cerradas.map(async (s) => (await db.actividades.get(s.actividadId))?.nombre ?? "Actividad"),
    );
    setEnSesion(false);
    setHoja({ t: "autocierre", nombres });
  }, []);

  useEffect(() => {
    void revisar();
    // Solo al arrancar, no cada vez que se vuelve a la app: reintentar en cada
    // foco podría quemar la cuota si el proveedor está devolviendo errores.
    void (async () => {
      await procesarPendientes();
      // No hay cron: el cierre del día ocurre al abrir la app después de
      // medianoche (CLAUDE.md §3).
      await cerrarDiasPendientes();
    })();
  }, [revisar]);
  useAlVolver(() => void revisar());

  /**
   * Los avisos se recalculan cada vez que cambian las tareas, no solo al
   * arrancar. Si no, una tarea que acaba de crear la IA no tomaría su hora
   * hasta el siguiente arranque, y marcar una como hecha no cancelaría su
   * recordatorio.
   */
  useEffect(() => {
    void reprogramarRecordatorios();
  }, [tareas]);

  // Cambio de día en vivo, sin recargar la app.
  useEffect(() => {
    const t = setTimeout(() => setDia(hoyISO()), msHastaMedianoche() + 1000);
    return () => clearTimeout(t);
  }, [dia]);

  // Si la sesión se cerró (aquí o sola), no puede quedar la pantalla de sesión.
  useEffect(() => {
    if (abierta === undefined && enSesion) setEnSesion(false);
  }, [abierta, enSesion]);

  useAtras(enSesion, () => setEnSesion(false));
  useAtras(!!seccion, () => setSeccion(null));

  /* ── acciones ──────────────────────────────────────────────────── */
  const iniciar = async (a: Actividad) => {
    if (abierta) {
      setHoja({ t: "conflicto", act: a });
      return;
    }
    await iniciarSesion(a.id!);
    setEnSesion(true);
  };

  const alternarPausa = async () => {
    if (!abierta) return;
    if (estaPausada(abierta)) await continuarSesion(abierta.id!);
    else await pausarSesion(abierta.id!);
  };

  const cerrarYEmpezar = async (a: Actividad) => {
    if (abierta) await finalizarSesion(abierta.id!, { audioPendiente: true });
    await iniciarSesion(a.id!);
    setHoja(null);
    setEnSesion(true);
  };

  const guardarCierre = async (o: { transcripcion?: string; audioPendiente: boolean }) => {
    if (abierta) await finalizarSesion(abierta.id!, o);
    setHoja(null);
    setEnSesion(false);
  };

  const nueva = async (datos: DatosActividad) => {
    await crearActividad(datos);
    setHoja(null);
  };

  const guardarCurso = async (id: number | undefined, datos: DatosCurso) => {
    if (id) await actualizarCurso(id, datos);
    else await crearCurso(datos);
    setHoja(null);
  };

  /* ── pantalla ──────────────────────────────────────────────────── */
  let pantalla;
  if (enSesion && abierta && actividadAbierta) {
    pantalla = (
      <PantallaSesion
        act={actividadAbierta}
        sesion={abierta}
        ahora={ahora}
        onAlternar={alternarPausa}
        onFin={() => setHoja({ t: "cerrar" })}
        onBack={() => setEnSesion(false)}
      />
    );
  } else if (tab === "capturar" && seccion) {
    // En tablet no hay «volver»: la lista de secciones sigue visible al lado.
    const volver = amplia ? undefined : () => setSeccion(null);
    if (seccion.k === "diario") {
      pantalla = (
        <Diario
          seccion={seccion}
          items={capturasSeccion}
          tieneKey={tieneKey}
          onBack={volver}
        />
      );
    } else if (seccion.k === "pendiente") {
      pantalla = (
        <Pendientes
          seccion={seccion}
          tareas={tareas}
          sinProcesar={capturasSeccion.filter((c) => c.estado === "nueva")}
          tieneKey={tieneKey}
          onBack={volver}
        />
      );
    } else {
      pantalla = (
        <Ideas
          seccion={seccion}
          items={capturasSeccion}
          tieneKey={tieneKey}
          onBack={volver}
        />
      );
    }
  } else if (tab === "capturar" && !amplia) {
    pantalla = (
      <Capturar
        cuentas={cuentas ?? { musica: 0, video: 0, negocio: 0, diario: 0, pendiente: 0 }}
        sinProcesar={pendientesIA.length}
        tieneKey={tieneKey}
        onAbrir={setSeccion}
        onAjustes={() => setHoja({ t: "ajustes" })}
      />
    );
  } else if (tab === "capturar") {
    // En tablet la lista vive a la izquierda; aquí solo va el vacío inicial.
    pantalla = (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 40 }}>
        <p style={{ fontSize: 13.5, color: "var(--ink2)", textAlign: "center", maxWidth: 320 }}>
          Elige una sección para verla aquí. Cada una guarda lo que digas sin pedirte nada más.
        </p>
      </div>
    );
  } else if (tab === "camino") {
    pantalla = <Camino tieneKey={tieneKey} amplia={amplia} />;
  } else if (tab === "horario") {
    pantalla = (
      <Horario
        cursos={cursos ?? []}
        amplia={amplia}
        onNuevo={() => setHoja({ t: "nuevoCurso" })}
        onDetalle={(curso) => setHoja({ t: "detalleCurso", curso })}
      />
    );
  } else {
    pantalla = (
      <Hoy
        actividades={actividades ?? []}
        msPorActividad={resumen.msPorActividad}
        msTotal={resumen.msTotal}
        sesionesHoy={resumen.sesiones}
        abierta={abierta}
        amplia={amplia}
        onNueva={() => setHoja({ t: "nueva" })}
        onIniciar={iniciar}
        onAlternarPausa={alternarPausa}
        onDetalle={(a) => setHoja({ t: "detalle", act: a })}
      />
    );
  }

  const irA = (k: Tab) => {
    setTab(k);
    setEnSesion(false);
    setSeccion(null);
  };

  const barraSesion = abierta && actividadAbierta && !enSesion && (
    <button
      className="btn"
      onClick={() => setEnSesion(true)}
      style={{
        margin: "0 14px 8px",
        padding: "11px 14px",
        borderRadius: 13,
        background: "var(--ink)",
        color: "var(--paper)",
        display: "flex",
        alignItems: "center",
        gap: 11,
        textAlign: "left",
        flexShrink: 0,
      }}
    >
      <div
        className={corriendo ? "pulse" : undefined}
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          flexShrink: 0,
          background: corriendo ? "var(--ambar)" : "var(--line)",
        }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13.5,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {actividadAbierta.nombre}
      </span>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
        {cronometro(msRegistrados(abierta, ahora))}
      </span>
      {corriendo ? <Pause size={16} /> : <Play size={16} />}
    </button>
  );

  const activo = (k: Tab) => tab === k && !enSesion;

  // Lo que llena el anillo ámbar de la burbuja: la referencia de la actividad
  // si la tiene, y si no el límite de las tres horas.
  const progresoSesion =
    abierta && actividadAbierta
      ? msRegistrados(abierta, ahora) /
        (actividadAbierta.referenciaMin > 0
          ? actividadAbierta.referenciaMin * MINUTO
          : LIMITE_ENFOQUE)
      : null;

  // Capturar en tablet: la lista de secciones queda fija a la izquierda del
  // contenido, así se salta de una sección a otra sin entrar y volver.
  const maestroDetalle = amplia && tab === "capturar" && !enSesion;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        justifyContent: "center",
        background: "var(--ground)",
      }}
    >
      <div
        style={
          {
            width: "100%",
            maxWidth: amplia ? 1180 : 560,
            height: "100dvh",
            position: "relative",
            overflow: "hidden",
            background: "var(--ground)",
            display: "flex",
            flexDirection: amplia ? "row" : "column",
            paddingTop: amplia ? 0 : "var(--safe-t)",
            // Todo lo que flota se ancla al panel de contenido, que ya excluye
            // la navegación y la barra de sesión. Por eso basta un margen.
            "--hueco-inferior": "16px",
            "--zona-alta": "12px",
            "--zona-baja": "84px",
          } as React.CSSProperties
        }
      >
        {amplia ? (
          <nav
            style={{
              width: 92,
              flexShrink: 0,
              borderRight: "1px solid var(--line)",
              background: "var(--paper)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "calc(var(--safe-t) + 14px) 8px calc(var(--safe-b) + 14px)",
            }}
          >
            {TABS.map(([k, l, I]) => (
              <button
                key={k}
                className="btn"
                onClick={() => irA(k)}
                style={{
                  padding: "13px 0",
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  gap: 5,
                  color: activo(k) ? "var(--pino)" : "var(--ink2)",
                  background: activo(k) ? "var(--ground)" : "transparent",
                }}
              >
                <I size={21} strokeWidth={activo(k) ? 2.1 : 1.6} />
                <span style={{ fontSize: 11, fontWeight: activo(k) ? 600 : 400 }}>{l}</span>
              </button>
            ))}
          </nav>
        ) : null}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            paddingTop: amplia ? "var(--safe-t)" : 0,
            // En compacta el área segura de abajo la cubre la navegación.
            paddingBottom: amplia ? "var(--safe-b)" : 0,
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            {maestroDetalle && (
              <div
                className="noscroll"
                style={{
                  width: 330,
                  flexShrink: 0,
                  overflowY: "auto",
                  borderRight: "1px solid var(--line)",
                }}
              >
                <Capturar
                  cuentas={
                    cuentas ?? { musica: 0, video: 0, negocio: 0, diario: 0, pendiente: 0 }
                  }
                  sinProcesar={pendientesIA.length}
                  tieneKey={tieneKey}
                  seleccion={seccion?.k ?? null}
                  comoLista
                  onAbrir={setSeccion}
                  onAjustes={() => setHoja({ t: "ajustes" })}
                />
              </div>
            )}

            {/* Posicionado para que el botón de grabar se ancle a este panel
                y no al borde de la pantalla entera. */}
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="noscroll" style={{ flex: 1, overflowY: "auto" }}>
                {pantalla}
              </div>

              {/* Dentro de la app y en las tres pantallas, nunca encima del
                  sistema operativo ni de la pantalla de sesión. */}
              {!enSesion && (
                <Burbuja
                  progresoSesion={progresoSesion}
                  onAbrir={() => setHoja({ t: "mascota" })}
                />
              )}
            </div>
          </div>

          {barraSesion}

          {!amplia && (
            <nav
              style={{
                display: "flex",
                borderTop: "1px solid var(--line)",
                background: "var(--paper)",
                paddingBottom: "var(--safe-b)",
                flexShrink: 0,
              }}
            >
              {TABS.map(([k, l, I]) => (
                <button
                  key={k}
                  className="btn"
                  onClick={() => irA(k)}
                  style={{
                    flex: 1,
                    padding: "11px 0 14px",
                    display: "grid",
                    placeItems: "center",
                    gap: 4,
                    color: activo(k) ? "var(--pino)" : "var(--ink2)",
                  }}
                >
                  <I size={20} strokeWidth={activo(k) ? 2.1 : 1.6} />
                  <span style={{ fontSize: 10.5, fontWeight: activo(k) ? 600 : 400 }}>{l}</span>
                </button>
              ))}
            </nav>
          )}
        </div>

        {hoja?.t === "nueva" && (
          <NuevaActividad onClose={() => setHoja(null)} onGuardar={nueva} />
        )}

        {hoja?.t === "nuevoCurso" && (
          <NuevoCurso onClose={() => setHoja(null)} onGuardar={(datos) => void guardarCurso(undefined, datos)} />
        )}

        {hoja?.t === "detalleCurso" && (
          <DetalleCurso
            curso={hoja.curso}
            onGuardar={(datos) => void guardarCurso(hoja.curso.id, datos)}
            onEliminar={async () => {
              await eliminarCurso(hoja.curso.id!);
              setHoja(null);
            }}
            onClose={() => setHoja(null)}
          />
        )}

        {hoja?.t === "ajustes" && (
          <Ajustes sinProcesar={pendientesIA.length} onClose={() => setHoja(null)} />
        )}

        {hoja?.t === "mascota" && (
          <HojaMascota
            onCamino={() => {
              setHoja(null);
              irA("camino");
            }}
            onClose={() => setHoja(null)}
          />
        )}

        {hoja?.t === "cerrar" && abierta && actividadAbierta && (
          <CerrarSesion
            act={actividadAbierta}
            sesion={abierta}
            ahora={ahora}
            onGuardar={guardarCierre}
            onClose={() => setHoja(null)}
          />
        )}

        {hoja?.t === "detalle" && (
          <DetalleActividad
            act={hoja.act}
            msHoy={resumen.msPorActividad.get(hoja.act.id!) ?? 0}
            onGuardar={async (datos) => {
              await actualizarActividad(hoja.act.id!, datos);
              setHoja(null);
            }}
            onRetirar={async () => {
              await retirarActividad(hoja.act.id!);
              setHoja(null);
            }}
            onClose={() => setHoja(null)}
          />
        )}

        {hoja?.t === "conflicto" && actividadAbierta && (
          <SesionEnCurso
            enCurso={actividadAbierta.nombre}
            nueva={hoja.act.nombre}
            onIr={() => {
              setHoja(null);
              setEnSesion(true);
            }}
            onCerrarYEmpezar={() => void cerrarYEmpezar(hoja.act)}
            onClose={() => setHoja(null)}
          />
        )}

        {hoja?.t === "autocierre" && (
          <Hoja onClose={() => setHoja(null)} eyebrow="Mientras no estabas" titulo="Se cerró sola">
            <p style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.6, margin: "0 0 14px" }}>
              {hoja.nombres.length === 1 ? "Esta sesión llegó" : "Estas sesiones llegaron"} a las 3 h
              y {hoja.nombres.length === 1 ? "se guardó" : "se guardaron"} en ese punto exacto. No se
              inventó el tiempo de después.
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {hoja.nombres.map((n, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ padding: "11px 13px", display: "flex", gap: 9, alignItems: "center" }}
                >
                  <Timer size={15} color="var(--ink2)" />
                  <span style={{ fontSize: 14 }}>{n}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink2)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Quedaron con el audio pendiente.
            </p>
          </Hoja>
        )}
      </div>
    </div>
  );
}
