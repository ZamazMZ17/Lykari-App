import { Capacitor } from "@capacitor/core";

/**
 * `true` dentro del APK, `false` cuando corre como PWA o en el navegador.
 * Lo que cambia de verdad son las notificaciones: en el APK son del sistema y
 * llegan con la app cerrada; en la web solo se ven al abrirla.
 */
export const esNativo = Capacitor.isNativePlatform();
