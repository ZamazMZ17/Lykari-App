import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lykari.app",
  appName: "Lykari",
  webDir: "dist",
  android: {
    // El fondo detrás de la WebView mientras carga: si no, parpadea en blanco.
    backgroundColor: "#DCE0D9",
  },
  plugins: {
    // En el APK, las llamadas a Sam y a otros servicios salen por la pila de
    // red nativa de Android, no por la WebView. CORS deja de ser requisito.
    CapacitorHttp: {
      enabled: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_lykari",
      iconColor: "#1F4D3F",
    },
  },
};

export default config;
