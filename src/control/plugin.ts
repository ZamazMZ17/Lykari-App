import { registerPlugin } from "@capacitor/core";
import type {
  AppInstalada,
  EstadoPermisos,
  ExtensionControl,
  IntentoBloqueado,
  ReglasControl,
  TipoPermiso,
  UsoApp,
  UsoDia,
} from "./tipos";

/**
 * El puente al motor de Control (`android/.../control/ControlPlugin.java`).
 *
 * JS solo edita reglas y lee datos; quien bloquea es el servicio de
 * accesibilidad nativo, que sigue corriendo con la app cerrada. Por eso cada
 * cambio de reglas se empuja entero con `guardarReglas`.
 *
 * En la web (o en un APK viejo sin el plugin) las llamadas fallan: usar
 * `esNativo` antes, o `esPluginAusente` de `src/voz/reconocedorNativo.ts`.
 */
export interface ControlPlugin {
  listarApps(opciones?: { incluirSistema?: boolean }): Promise<{ apps: AppInstalada[] }>;
  usoHoy(): Promise<{ apps: UsoApp[] }>;
  /** `desde`/`hasta` en DiaISO, inclusivos. Android guarda detalle de ~7-10 días. */
  usoRango(opciones: { desde: string; hasta: string }): Promise<{ dias: UsoDia[] }>;

  estadoPermisos(): Promise<EstadoPermisos>;
  abrirAjustesPermiso(opciones: { tipo: TipoPermiso }): Promise<void>;

  guardarReglas(opciones: { reglas: ReglasControl }): Promise<void>;
  /** Espejo del hash SHA-256 de la contraseña de Zamly (hex), para la pantalla de bloqueo. */
  /** El método permite que Android pida el patrón girado, nunca la clave plana. */
  guardarHashContrasena(opciones: { hash: string; metodo?: "patron" | "clave" }): Promise<void>;
  /** Solo llamar después de verificar la contraseña en JS. */
  activarProteccion(opciones: { activa: boolean }): Promise<void>;

  extensiones(opciones?: { desde?: number }): Promise<{ extensiones: ExtensionControl[] }>;
  intentos(opciones?: { desde?: number }): Promise<{ intentos: IntentoBloqueado[] }>;
}

export const Control = registerPlugin<ControlPlugin>("Control");
