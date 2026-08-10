import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // El manifiesto y el service worker se generan siempre, pero en el APK no
    // se registran (ver src/main.tsx): ahí los archivos ya están dentro de la
    // app y un service worker solo serviría copias viejas tras actualizar.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icono-180.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
      manifest: {
        name: "Lykari",
        short_name: "Lykari",
        description: "Registro de lo que de verdad hiciste.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#DCE0D9",
        theme_color: "#DCE0D9",
        icons: [
          { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icono-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
