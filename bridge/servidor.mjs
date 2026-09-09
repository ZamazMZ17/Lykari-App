/**
 * Lykari Bridge — servidor personal para que la laptop sea el punto de
 * sincronización. No recibe claves de IA y no expone el registro sin token.
 *
 *   LYKARI_SYNC_TOKEN="una-clave-larga" node bridge/servidor.mjs
 *
 * Para móvil/PWA úsalo detrás de HTTPS (Tailscale Serve, Cloudflare Tunnel o
 * un proxy propio). No se habilita HTTP inseguro en la app deliberadamente.
 */
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";

const puerto = Number(process.env.PORT ?? 8787);
const token = process.env.LYKARI_SYNC_TOKEN;
const archivo = resolve(process.env.LYKARI_SYNC_FILE ?? "bridge/data/lykari-sync.json");
const origenes = new Set((process.env.LYKARI_ALLOWED_ORIGINS ?? "").split(",").map((x) => x.trim()).filter(Boolean));
const zona = process.env.LYKARI_TIMEZONE ?? "America/Lima";
const MAX_BYTES = 100 * 1024 * 1024;

if (!token || token.length < 20) {
  console.error("Define LYKARI_SYNC_TOKEN con una clave aleatoria de al menos 20 caracteres.");
  process.exit(1);
}

function autorizado(req) {
  const recibido = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(recibido);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cors(req, res) {
  const origen = req.headers.origin;
  if (origen && (origenes.has(origen) || origenes.has("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origenes.has("*") ? "*" : origen);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, If-Match");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
  }
}
function responder(req, res, estado, cuerpo, extra = {}) {
  cors(req, res);
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8", ...extra });
  res.end(cuerpo === undefined ? "" : JSON.stringify(cuerpo));
}
function diaActual() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
async function leerCuerpo(req) {
  return new Promise((resolveBody, reject) => {
    let total = 0;
    const partes = [];
    req.on("data", (trozo) => {
      total += trozo.length;
      if (total > MAX_BYTES) {
        reject(new Error("El archivo supera 100 MB."));
        req.destroy();
      } else partes.push(trozo);
    });
    req.on("end", () => resolveBody(Buffer.concat(partes).toString("utf8")));
    req.on("error", reject);
  });
}
function esRespaldo(x) {
  return x && x.formato === "lykari-respaldo" && Number.isInteger(x.version) && x.tablas && typeof x.tablas === "object";
}
async function leerEstado() {
  try {
    const datos = JSON.parse(await readFile(archivo, "utf8"));
    return esRespaldo(datos.snapshot) && Number.isInteger(datos.revision) ? datos : null;
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
}
async function guardarEstado(snapshot, revision) {
  const estado = { revision, updatedAt: new Date().toISOString(), snapshot };
  await mkdir(dirname(archivo), { recursive: true });
  const temporal = `${archivo}.tmp`;
  await writeFile(temporal, JSON.stringify(estado), "utf8");
  await rename(temporal, archivo);
  return estado;
}
function resumen(snapshot) {
  const tablas = snapshot.tablas ?? {};
  const hoy = diaActual();
  const sesiones = Array.isArray(tablas.sesiones) ? tablas.sesiones.filter((s) => s.dia === hoy) : [];
  const actividades = Array.isArray(tablas.actividades) ? tablas.actividades : [];
  const ms = sesiones.reduce((suma, s) => suma + Math.max(0, (s.fin ?? Date.now()) - s.inicio), 0);
  return {
    fecha: hoy,
    minutosRegistrados: Math.round(ms / 60000),
    sesiones: sesiones.length,
    actividadesActivas: actividades.filter((a) => a.activa === 1).length,
    actividades: actividades.filter((a) => a.activa === 1).map((a) => ({ id: a.id, nombre: a.nombre, tipo: a.tipo })),
  };
}
function siguienteId(filas) {
  return filas.reduce((max, fila) => Math.max(max, Number(fila.id) || 0), 0) + 1;
}
async function llamadaMcp(req, res, cuerpo) {
  const id = cuerpo?.id ?? null;
  const respuesta = (result) => responder(req, res, 200, { jsonrpc: "2.0", id, result });
  const error = (message) => responder(req, res, 200, { jsonrpc: "2.0", id, error: { code: -32602, message } });
  if (cuerpo?.method === "initialize") {
    return respuesta({ protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "lykari-bridge", version: "1.0.0" } });
  }
  if (cuerpo?.method === "notifications/initialized") return responder(req, res, 202);
  if (cuerpo?.method === "tools/list") {
    return respuesta({ tools: [
      { name: "resumen_hoy", description: "Lee solo los minutos, sesiones y actividades registradas hoy en Lykari.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
      { name: "listar_actividades", description: "Lista las actividades activas que pueden registrarse en Lykari.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
      { name: "registrar_sesion", description: "Registra una sesión ya terminada sobre una actividad existente. No inicia cronómetros ni borra datos.", inputSchema: { type: "object", properties: { actividad: { type: "string", description: "Nombre exacto de una actividad activa" }, minutos: { type: "integer", minimum: 1, maximum: 180 }, nota: { type: "string", maxLength: 600 } }, required: ["actividad", "minutos"], additionalProperties: false } },
    ] });
  }
  if (cuerpo?.method !== "tools/call") return error("Método no compatible.");
  const estado = await leerEstado();
  if (!estado) return respuesta({ content: [{ type: "text", text: "Aún no hay una copia sincronizada desde Lykari." }], isError: true });
  const { name, arguments: args = {} } = cuerpo.params ?? {};
  if (name === "resumen_hoy") return respuesta({ content: [{ type: "text", text: JSON.stringify(resumen(estado.snapshot)) }] });
  if (name === "listar_actividades") return respuesta({ content: [{ type: "text", text: JSON.stringify(resumen(estado.snapshot).actividades) }] });
  if (name !== "registrar_sesion") return error("Herramienta no compatible.");
  const minutos = Number(args.minutos);
  const actividad = String(args.actividad ?? "").trim();
  if (!actividad || !Number.isInteger(minutos) || minutos < 1 || minutos > 180) return error("Actividad o duración inválida.");
  const actividades = Array.isArray(estado.snapshot.tablas.actividades) ? estado.snapshot.tablas.actividades : [];
  const encontrada = actividades.find((a) => a.activa === 1 && a.nombre.toLocaleLowerCase() === actividad.toLocaleLowerCase());
  if (!encontrada) return respuesta({ content: [{ type: "text", text: `No encuentro una actividad activa llamada «${actividad}».` }], isError: true });
  const sesiones = Array.isArray(estado.snapshot.tablas.sesiones) ? estado.snapshot.tablas.sesiones : (estado.snapshot.tablas.sesiones = []);
  const fin = Date.now();
  sesiones.push({ id: siguienteId(sesiones), actividadId: encontrada.id, dia: diaActual(), inicio: fin - minutos * 60000, fin, abierta: 0, pausas: [], transcripcion: typeof args.nota === "string" ? args.nota.trim() || undefined : undefined, cerradaAuto: false, audioPendiente: false });
  const guardado = await guardarEstado(estado.snapshot, estado.revision + 1);
  return respuesta({ content: [{ type: "text", text: `Registré ${minutos} min en ${encontrada.nombre}. Revisión ${guardado.revision}.` }] });
}

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return responder(req, res, 204);
    if (req.method === "GET" && req.url === "/v1/health") return responder(req, res, 200, { ok: true });
    if (!autorizado(req)) return responder(req, res, 401, { error: "unauthorized" });
    if (req.method === "GET" && req.url === "/v1/snapshot") {
      const estado = await leerEstado();
      if (!estado) return responder(req, res, 404, { error: "sync_empty" });
      return responder(req, res, 200, estado.snapshot, { "X-Lykari-Revision": String(estado.revision) });
    }
    if (req.method === "PUT" && req.url === "/v1/snapshot") {
      const esperado = req.headers["if-match"];
      const actual = await leerEstado();
      const revisionActual = actual?.revision ?? 0;
      if (String(esperado ?? "") !== String(revisionActual)) return responder(req, res, 412, { error: "revision_conflict", revision: revisionActual });
      let snapshot;
      try { snapshot = JSON.parse(await leerCuerpo(req)); } catch { return responder(req, res, 400, { error: "invalid_json" }); }
      if (!esRespaldo(snapshot)) return responder(req, res, 400, { error: "invalid_snapshot" });
      const guardado = await guardarEstado(snapshot, revisionActual + 1);
      return responder(req, res, 200, { revision: guardado.revision, updatedAt: guardado.updatedAt }, { "X-Lykari-Revision": String(guardado.revision) });
    }
    if (req.method === "GET" && req.url === "/v1/summary") {
      const estado = await leerEstado();
      return estado ? responder(req, res, 200, { revision: estado.revision, ...resumen(estado.snapshot) }) : responder(req, res, 404, { error: "sync_empty" });
    }
    if (req.method === "POST" && req.url === "/mcp") {
      let cuerpo;
      try { cuerpo = JSON.parse(await leerCuerpo(req)); } catch { return responder(req, res, 400, { error: "invalid_json" }); }
      return llamadaMcp(req, res, cuerpo);
    }
    return responder(req, res, 404, { error: "not_found" });
  } catch (e) {
    console.error(e);
    return responder(req, res, 500, { error: "internal_error" });
  }
}).listen(puerto, "0.0.0.0", () => console.log(`Lykari Bridge listo en el puerto ${puerto}.`));
