import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * El puente al reconocedor del teléfono (`android/.../Reconocedor.java`).
 *
 * Es el mismo servicio de voz que usa el teclado de Google para dictar, pero
 * pedido con lo que hace falta aquí: silencios largos (una orden se dicta con
 * pausas), preferir el reconocimiento **en el teléfono** —la espera a la red
 * es la demora que se siente al dictar— y el resultado final repasado de cada
 * tramo, no solo los parciales.
 *
 * En un APK viejo el plugin no está registrado y cualquier llamada revienta
 * con «not implemented»: `esPluginAusente` lo detecta para poder decirlo con
 * claridad en vez de fallar en silencio.
 */

/** Por qué se cerró un tramo de escucha. */
export type MotivoCorte = "resultado" | "silencio" | "red" | "idioma" | "permiso" | "error";

export interface CorteNativo {
  /** El texto final del tramo cuando `motivo` es «resultado»; "" en errores. */
  texto: string;
  motivo: MotivoCorte;
  codigo?: number;
}

interface OpcionesIniciar {
  idioma?: string;
  /** Reconocer en el teléfono si hay paquete de idioma. Falso = puede usar la red. */
  preferirOffline?: boolean;
  /** Cuánto silencio aguanta antes de cerrar el tramo por su cuenta. */
  silencioMs?: number;
  /** Palabras propias de la app (nombres de actividades, «Sam») que ayudan a acertar. */
  frasesFavorecidas?: string[];
}

interface ReconocedorNativoPlugin {
  disponible(): Promise<{ disponible: boolean }>;
  iniciar(opciones: OpcionesIniciar): Promise<void>;
  detener(): Promise<void>;
  cancelar(): Promise<void>;
  addListener(evento: "parcial", fn: (d: { texto: string }) => void): Promise<PluginListenerHandle>;
  addListener(evento: "corte", fn: (d: CorteNativo) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const ReconocedorNativo = registerPlugin<ReconocedorNativoPlugin>("Reconocedor");

/** ¿El error es «este APK no trae el plugin»? */
export function esPluginAusente(e: unknown): boolean {
  return e instanceof Error && /not implemented|no implementad/i.test(e.message);
}
