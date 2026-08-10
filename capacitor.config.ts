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
    LocalNotifications: {
      smallIcon: "ic_stat_lykari",
      iconColor: "#1F4D3F",
    },
  },
};

export default config;
