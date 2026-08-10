// Abre la app en el celular conectado por depuración USB.
//
// Usa `adb reverse`, no la IP de la laptop: así el teléfono la ve en
// http://localhost:5173, que cuenta como origen seguro. Sin eso Android no
// registra el service worker y la PWA no se puede instalar ni probar offline.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PUERTO = process.argv[2] ?? "5173";

const candidatos = [
  join(homedir(), "AppData/Local/Android/Sdk/platform-tools/adb.exe"),
  join(homedir(), "Android/Sdk/platform-tools/adb"),
  "adb",
];
const adb = candidatos.find((r) => r === "adb" || existsSync(r));

const correr = (...args) =>
  execFileSync(adb, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const dispositivos = correr("devices")
  .split("\n")
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => l.endsWith("device"));

if (dispositivos.length === 0) {
  console.error("No hay ningún teléfono en modo depuración. Conéctalo y acepta el aviso.");
  process.exit(1);
}

correr("reverse", `tcp:${PUERTO}`, `tcp:${PUERTO}`);
correr(
  "shell",
  "am",
  "start",
  "-a",
  "android.intent.action.VIEW",
  "-d",
  `http://localhost:${PUERTO}`,
);

console.log(`✓ ${dispositivos[0].split("\t")[0]} → http://localhost:${PUERTO}`);
console.log("  Para instalarla: menú de Chrome → Añadir a pantalla de inicio.");
