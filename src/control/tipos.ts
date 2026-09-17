/* ── Control: tiempo en pantalla y filtro +18 ─────────────────────────
 * Contrato compartido entre la UI (JS) y el motor nativo (Android). El JSON
 * de `ReglasControl` es exactamente lo que JS le pasa a
 * `Control.guardarReglas` y lo que `ReglasStore.java` lee: cambiar un nombre
 * acá obliga a cambiarlo en Java.
 *
 * Es una herramienta que el usuario se impone a sí mismo, no un plan contra el
 * cual medirlo: no hay estado "fallaste", ni rojo, ni culpa (CLAUDE.md §2). */

/** 0 = domingo … 6 = sábado, igual que `Date.getDay()` y `Calendar` - 1. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** "HH:MM" en 24 h, hora local del teléfono. */
export type HoraMinuto = string;

export interface AppInstalada {
  paquete: string;
  nombre: string;
  /** PNG en base64 sin prefijo `data:`. Puede faltar si el ícono no se pudo leer. */
  iconoBase64?: string;
  /** Categoría de Android (juego, social, video…) o "otra". */
  categoria: string;
  esSistema: boolean;
}

export interface UsoApp {
  paquete: string;
  /** Tiempo en primer plano, en ms. */
  ms: number;
  aperturas: number;
}

export interface UsoDia {
  dia: string; // DiaISO
  apps: UsoApp[];
}

export interface LimiteApp {
  paquete: string;
  /** Minutos por día. 0 = bloqueada todo el día. */
  minutosDia: number;
  /** Veces que se puede abrir por día. Sin marca = sin límite de aperturas. */
  aperturasDia?: number;
  /** Días en que aplica el límite. Vacío = todos. */
  dias: DiaSemana[];
  activo: boolean;
}

export interface ReglaWeb {
  id: string;
  tipo: "dominio" | "palabra";
  /** Dominio sin esquema ("instagram.com") o palabra clave en minúsculas. */
  valor: string;
  /** Minutos por día; `null` = bloqueada siempre. */
  minutosDia: number | null;
  activo: boolean;
}

export interface HorarioModo {
  dias: DiaSemana[];
  desde: HoraMinuto;
  /** Si `hasta` < `desde`, el modo cruza la medianoche (ej. sueño 23:00–07:00). */
  hasta: HoraMinuto;
}

export type PlantillaModo = "estudio" | "sueno" | "clase" | "propio";

export interface ModoControl {
  id: string;
  nombre: string;
  plantilla: PlantillaModo;
  horarios: HorarioModo[];
  /** "bloquear": se bloquean `apps`. "permitir": solo se permiten `apps` (+ LyKari y el teléfono). */
  estrategia: "bloquear" | "permitir";
  apps: string[];
  webs: string[];
  /** Poner el teléfono en No molestar (silencio, sin notificaciones) mientras el modo está activo. */
  silencio: boolean;
  activo: boolean;
}

export interface FiltroAdulto {
  activo: boolean;
  /** Capa DNS con VpnService. */
  dns: boolean;
  forzarSafeSearch: boolean;
  /** Palabras propias, además de la lista base empaquetada. */
  palabras: string[];
  dominios: string[];
  /** Títulos de chats/canales de Telegram marcados a mano. */
  chatsBloqueados: string[];
  bloquearBusquedaTelegram: boolean;
  /**
   * Bloquear las "puertas": catálogos de canales/grupos de Telegram, enlaces de
   * invitación (`t.me/joinchat`, `t.me/+…`) con palabras +18, subreddits NSFW,
   * sitios de chat con desconocidos. Lista base empaquetada en `Motor.java`.
   */
  bloquearPuertas: boolean;
  /**
   * En las apps de `appsVigiladas`, bloquear cuando en pantalla aparece una
   * marca de contenido sensible ("NSFW", "18+", "contenido sensible"…), aunque
   * el nombre del chat o canal sea inocente.
   */
  etiquetasSensibles: boolean;
  /** Apps cuyo texto visible (título de chat, marcas) se revisa. */
  appsVigiladas: string[];
  /** Paquetes de navegadores cuya URL se puede leer. Los demás navegadores se bloquean. */
  navegadoresPermitidos: string[];
  /** Si hay una petición de apagado, cuándo se pidió (ms). Se apaga pasadas 24 h. */
  apagadoPedidoEn: number | null;
}

export interface Proteccion {
  /** Admin de dispositivo + accesibilidad tapando desinstalar/quitar permisos. */
  activa: boolean;
  desde: number | null;
}

export interface PuertaEstudio {
  activa: boolean;
  /** Paquetes que requieren estudiar antes de poder abrirlos. */
  apps: string[];
  /** Evita volver a aplicar la selección inicial después de que Zamly la edite. */
  configurada: boolean;
}

/** Distracciones que se bloquean desde la primera actualización de la puerta. */
export const APPS_PUERTA_ESTUDIO_INICIAL: string[] = [
  "com.zhiliaoapp.musically", // TikTok
  "com.instagram.android",
  "com.supercell.clashroyale",
  "com.dts.freefireth",
  "com.dts.freefiremax",
];

/** Un crédito es de una sola app; el motor nativo decide su duración y tope. */
export type OrigenCreditoEstudio = "quiz" | "ejercicio";

export interface ResultadoCreditoEstudio {
  concedido: boolean;
  hastaMs: number;
  /** -1 cuando no hay tope diario de créditos. */
  restantesHoy: number;
  motivo?: "puerta_inactiva" | "app_no_elegida" | "whatsapp_libre" | "credito_vigente" | "tope_diario" | "ejercicio_ya_usado";
}

export interface ReglasControl {
  version: 1;
  limites: LimiteApp[];
  webs: ReglaWeb[];
  modos: ModoControl[];
  filtroAdulto: FiltroAdulto;
  proteccion: Proteccion;
  puertaEstudio: PuertaEstudio;
  actualizado: number;
}

export interface EstadoPermisos {
  uso: boolean;
  accesibilidad: boolean;
  admin: boolean;
  superposicion: boolean;
  vpn: boolean;
  notificaciones: boolean;
  /** Acceso a No molestar, para el silencio automático de los modos. */
  noMolestar: boolean;
}

export type TipoPermiso = keyof EstadoPermisos;

export type MotivoBloqueo = "limite" | "aperturas" | "modo" | "web" | "adulto" | "proteccion" | "vpn" | "estudio";

/** Extensión pedida desde la pantalla de bloqueo, con contraseña. */
export interface ExtensionControl {
  fecha: number;
  paquete: string;
  minutos: number;
}

/** Intento bloqueado. Nunca guarda la URL completa ni texto de chats. */
export interface IntentoBloqueado {
  fecha: number;
  motivo: MotivoBloqueo;
  /** Paquete o dominio. */
  origen: string;
}

export const DIA_EN_MS = 24 * 60 * 60 * 1000;
export const ESPERA_APAGAR_ADULTO_MS = DIA_EN_MS;

/** Telegram (y sus clientes), Reddit, X, Discord, Instagram y TikTok. */
export const APPS_VIGILADAS_BASE: string[] = [
  "org.telegram.messenger",
  "org.telegram.messenger.web",
  "org.thunderdog.challegram",
  "org.telegram.plus",
  "com.reddit.frontpage",
  "com.twitter.android",
  "com.discord",
  "com.instagram.android",
  "com.zhiliaoapp.musically",
];

export function reglasVacias(ahora = Date.now()): ReglasControl {
  return {
    version: 1,
    limites: [],
    webs: [],
    modos: [],
    filtroAdulto: {
      activo: false,
      dns: true,
      forzarSafeSearch: true,
      palabras: [],
      dominios: [],
      chatsBloqueados: [],
      bloquearBusquedaTelegram: false,
      bloquearPuertas: true,
      etiquetasSensibles: true,
      appsVigiladas: APPS_VIGILADAS_BASE,
      navegadoresPermitidos: ["com.android.chrome"],
      apagadoPedidoEn: null,
    },
    proteccion: { activa: false, desde: null },
    puertaEstudio: {
      activa: true,
      apps: APPS_PUERTA_ESTUDIO_INICIAL,
      configurada: false,
    },
    actualizado: ahora,
  };
}
