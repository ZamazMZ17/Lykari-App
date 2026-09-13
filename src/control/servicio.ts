import { esNativo } from "../lib/plataforma";
import { Control } from "./plugin";
import { controlMock } from "./mock";

/** El simulador nunca sustituye el motor en un APK ni en una compilación publicada. */
export function usaMock(): boolean {
  return import.meta.env.DEV && !esNativo && localStorage.getItem("lykariControlMock") === "1";
}
export function motorControl() { return usaMock() ? controlMock : Control; }
