import { BookOpenCheck, Check, CloudDownload, FilePlus2, Link2, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { convertirAulaEnTarea, estadoAula, itemsAulaActivos, marcarLeidoAula, ocultarAula, vincularAulaACurso, type FuenteAula } from "../db/aula";
import { cursosActivos } from "../db/cursos";
import type { ItemAulaUPC } from "../db/db";
import { fechaCorta, hoyISO } from "../lib/fecha";
import { abrirSesionUPCEnLaptop } from "../sync/aula";
import { guardarUrlCalendarioUPC, leerUrlCalendarioUPC, sincronizarCalendarioUPC } from "../sync/calendarioUpc";
import { Header, Nota } from "../ui/piezas";

type Filtro = "todo" | "novedades" | "proximo";

function estadoFuente(nombre: string, fuente?: FuenteAula) {
  if (!fuente) return `${nombre}: aún no verificado`;
  if (fuente.estado === "ok") return `${nombre}: verificado`;
  if (fuente.estado === "sin_sesion") return `${nombre}: requiere iniciar sesión en Sam`;
  if (fuente.estado === "sin_configurar") return `${nombre}: falta configurar`;
  return `${nombre}: ${fuente.mensaje ?? "no se pudo verificar"}`;
}

function etiqueta(item: ItemAulaUPC) {
  return item.tipo === "anuncio" ? "Anuncio" : item.tipo === "examen" ? "Examen" : item.tipo === "control" ? "Control" : item.tipo === "evaluacion" ? "Evaluación" : "Entrega";
}

export function AulaUPC({ onBack }: { onBack: () => void }) {
  const items = useLiveQuery(itemsAulaActivos, [], []);
  const cursos = useLiveQuery(cursosActivos, [], []);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [cursoId, setCursoId] = useState<number | "todos">("todos");
  const [estado, setEstado] = useState<Awaited<ReturnType<typeof estadoAula>>>();
  const [actualizando, setActualizando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [urlCalendario, setUrlCalendario] = useState("");
  const [editarCalendario, setEditarCalendario] = useState(false);

  const cargarEstado = () => void estadoAula().then(setEstado);

  useEffect(() => {
    void (async () => {
      const url = await leerUrlCalendarioUPC();
      setUrlCalendario(url);
      cargarEstado();
      // El calendario se consulta al abrir Aula UPC: no depende de Sam ni de la laptop.
      if (!url) return;
      try {
        await sincronizarCalendarioUPC();
        cargarEstado();
      } catch {
        // La última copia sigue disponible. El error detallado se muestra si el usuario toca actualizar.
      }
    })();
  }, []);

  const visibles = useMemo(() => items.filter((item) => {
    if (cursoId !== "todos" && item.cursoId !== cursoId) return false;
    if (filtro === "novedades") return !!item.novedad && !item.leido;
    if (filtro === "proximo") return !!item.vence && item.vence >= hoyISO();
    return true;
  }), [items, filtro, cursoId]);
  const proximos = items.filter((item) => item.vence && item.vence >= hoyISO()).slice(0, 3);

  const actualizar = async () => {
    setActualizando(true);
    setMensaje("");
    try {
      const resultado = await sincronizarCalendarioUPC();
      cargarEstado();
      setMensaje(resultado.eventos === 1 ? "Calendario actualizado · 1 fecha encontrada." : `Calendario actualizado · ${resultado.eventos} fechas encontradas.`);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo actualizar el calendario.");
      if (!urlCalendario) setEditarCalendario(true);
    } finally {
      setActualizando(false);
    }
  };

  const guardarCalendario = async () => {
    setMensaje("");
    try {
      await guardarUrlCalendarioUPC(urlCalendario);
      setEditarCalendario(false);
      await actualizar();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar el calendario.");
    }
  };

  const abrirSesion = async () => {
    setMensaje("");
    try { setMensaje(await abrirSesionUPCEnLaptop()); }
    catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo abrir la sesión."); }
  };

  return <div style={{ paddingBottom: 24 }}>
    <Header eyebrow="Universidad" title="Aula UPC" onBack={onBack} right={
      <button className="btn card" onClick={() => void actualizar()} disabled={actualizando} aria-label="Actualizar calendario UPC" style={{ padding: 9, display: "flex", color: actualizando ? "var(--ambar)" : undefined }}>
        <RefreshCw size={18} className={actualizando ? "girando" : undefined} />
      </button>
    } />
    <div style={{ padding: "2px 20px 12px", display: "grid", gap: 5 }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink2)" }}>{estado?.ultima ? `Última copia: ${new Date(estado.ultima).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Aún no hay una copia del aula."}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink2)" }}>{estadoFuente("Calendario", estado?.fuentes?.calendario)} · {estadoFuente("Aula", estado?.fuentes?.aula)}</div>
      <button className="btn chip" onClick={() => setEditarCalendario(!editarCalendario)} style={{ justifySelf: "start", display: "inline-flex", gap: 6, alignItems: "center", padding: "5px 10px" }}>
        <Link2 size={13} /> {urlCalendario ? "Cambiar calendario móvil" : "Conectar calendario móvil"}
      </button>
      {editarCalendario && <div className="card" style={{ padding: 10, display: "grid", gap: 8 }}>
        <label className="eyebrow" style={{ fontSize: 9 }}>Enlace privado .ics de UPC</label>
        <input
          value={urlCalendario}
          onChange={(e) => setUrlCalendario(e.target.value)}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://aulavirtual.upc.edu.pe/…/learn.ics"
          style={{ width: "100%", padding: "10px 11px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--ground)", color: "var(--ink)", fontSize: 12 }}
        />
        <div style={{ fontSize: 11.5, color: "var(--ink2)", lineHeight: 1.45 }}>Solo en este teléfono. Sin laptop.</div>
        <button className="btn chip" onClick={() => void guardarCalendario()} disabled={actualizando} style={{ justifySelf: "start", display: "inline-flex", gap: 6, alignItems: "center", padding: "6px 10px" }}>
          <Save size={13} /> Guardar y actualizar
        </button>
      </div>}
      {estado?.fuentes?.aula?.estado === "sin_sesion" && <button className="btn chip" onClick={() => void abrirSesion()} style={{ justifySelf: "start" }}>Abrir sesión UPC en laptop</button>}
      {mensaje && <div style={{ fontSize: 12, color: "var(--ink2)" }}>{mensaje}</div>}
      <div style={{ fontSize: 11.5, color: "var(--ink2)" }}>Las entregas que UPC marca como enviadas se ocultan automáticamente.</div>
    </div>

    {proximos.length > 0 && <section style={{ padding: "0 20px 14px" }}>
      <div className="eyebrow" style={{ marginBottom: 7 }}>Próximos 7 días</div>
      <div style={{ display: "grid", gap: 7 }}>{proximos.map((item) => <Fila key={item.id} item={item} cursos={cursos} />)}</div>
    </section>}

    <div style={{ padding: "0 20px", display: "flex", gap: 6, overflowX: "auto" }}>
      {([ ["todo", "Todo"], ["novedades", "Novedades"], ["proximo", "Fechas"] ] as [Filtro, string][]).map(([id, texto]) => <button key={id} className="btn chip" onClick={() => setFiltro(id)} style={{ background: filtro === id ? "var(--ink)" : undefined, color: filtro === id ? "var(--paper)" : undefined, whiteSpace: "nowrap" }}>{texto}</button>)}
      <select value={cursoId} onChange={(e) => setCursoId(e.target.value === "todos" ? "todos" : Number(e.target.value))} style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 999, color: "var(--ink)", padding: "5px 9px", font: "inherit", fontSize: 12 }}>
        <option value="todos">Todos los cursos</option>
        {cursos.map((curso) => <option key={curso.id} value={curso.id}>{curso.nombre}</option>)}
      </select>
    </div>

    {visibles.length === 0 ? <Nota icono={<BookOpenCheck size={16} color="var(--ink2)" />}>No hay elementos para este filtro.</Nota> : <div style={{ padding: "14px 20px", display: "grid", gap: 8 }}>{visibles.map((item) => <Fila key={item.id} item={item} cursos={cursos} completa />)}</div>}
  </div>;
}

function Fila({ item, cursos, completa = false }: { item: ItemAulaUPC; cursos: { id?: number; nombre: string }[]; completa?: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  const curso = cursos.find((c) => c.id === item.cursoId)?.nombre ?? item.cursoClave ?? "Curso por vincular";
  const actuar = async () => { setOcupado(true); await convertirAulaEnTarea(item); setOcupado(false); };
  const quitar = async () => { setOcupado(true); await ocultarAula(item.id); setOcupado(false); };
  return <div className="card" style={{ padding: "11px 12px", borderStyle: item.novedad && !item.leido ? "solid" : "dashed" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <CloudDownload size={16} color="var(--pino)" style={{ marginTop: 2, flexShrink: 0 }} />
      <button className="btn" onClick={() => void marcarLeidoAula(item.id)} style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>{etiqueta(item)} · {curso}{item.vence ? ` · ${fechaCorta(item.vence)}` : ""}</div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.titulo}</div>
        {completa && item.descripcion && <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.45, marginTop: 4 }}>{item.descripcion}</div>}
      </button>
      {item.tipo !== "anuncio" && <button className="btn" disabled={ocupado || !!item.convertidoTareaId} onClick={() => void actuar()} aria-label="Convertir en pendiente" style={{ padding: 5, color: item.convertidoTareaId ? "var(--pino)" : "var(--ink2)" }}>
        {item.convertidoTareaId ? <Check size={16} /> : <FilePlus2 size={16} />}
      </button>}
      {completa && <button className="btn" disabled={ocupado} onClick={() => void quitar()} aria-label="Quitar de mi Aula" title="Quitar de mi Aula" style={{ padding: 5, color: "var(--ink2)" }}>
        <Trash2 size={16} />
      </button>}
    </div>
    {!item.cursoId && cursos.length > 0 && <select defaultValue="" onChange={(e) => { if (e.target.value) void vincularAulaACurso(item.id, Number(e.target.value)); }} style={{ margin: "8px 0 0 26px", width: "calc(100% - 26px)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink2)", padding: "6px", font: "inherit", fontSize: 11.5 }}>
      <option value="">Vincular este elemento a un curso…</option>
      {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
    </select>}
  </div>;
}
