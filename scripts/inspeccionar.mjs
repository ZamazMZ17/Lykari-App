// Evalúa JavaScript dentro de la WebView del APK, por el protocolo de
// depuración de Chrome sobre adb. `node scripts/inspeccionar.mjs "<expresión>"`
//
// Sirve para ver qué está pasando de verdad en el dispositivo cuando el
// navegador de escritorio dice una cosa y el teléfono hace otra.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Con `@ruta` la expresión se lee de un archivo: para código largo, la consola
// se pelea con las comillas y acaba rompiendo el script.
const argumento = process.argv[2] ?? "document.body.innerText.slice(0,200)";
const expresion = argumento.startsWith("@")
  ? readFileSync(argumento.slice(1), "utf8")
  : argumento;

const adb = [
  join(homedir(), "AppData/Local/Android/Sdk/platform-tools/adb.exe"),
  "adb",
].find((r) => r === "adb" || existsSync(r));

const correr = (...args) => execFileSync(adb, args, { encoding: "utf8" });

const socket = correr("shell", "cat", "/proc/net/unix")
  .split("\n")
  .map((l) => l.trim().split(/\s+/).pop())
  .find((n) => n?.startsWith("@webview_devtools_remote"));

if (!socket) {
  console.error("No encontré la WebView. ¿Está la app abierta?");
  process.exit(1);
}

correr("forward", "tcp:9222", `localabstract:${socket.slice(1)}`);

const paginas = await (await fetch("http://localhost:9222/json/list")).json();
const pagina = paginas.find((p) => p.type === "page" && p.webSocketDebuggerUrl);
if (!pagina) {
  console.error("La WebView no expone ninguna página.");
  process.exit(1);
}

const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

const respuesta = await new Promise((resolve) => {
  ws.onmessage = (e) => resolve(JSON.parse(e.data));
  ws.send(
    JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression: expresion, returnByValue: true, awaitPromise: true },
    }),
  );
});
ws.close();

const r = respuesta.result;
if (r?.exceptionDetails) console.error("Excepción:", r.exceptionDetails.text);
console.log(JSON.stringify(r?.result?.value ?? r?.result, null, 2));
correr("forward", "--remove", "tcp:9222");
