import { createRoot } from "react-dom/client";

import "@fontsource-variable/fraunces";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./estilos.css";

import App from "./App";
import { esNativo } from "./lib/plataforma";

// Preferencia del sistema aplicada antes del primer pintado, para que quien
// tenga el móvil en oscuro no vea un fogonazo claro. Al cargar el ajuste
// guardado, useTema lo corrige si eligió otra cosa (el caso común, «sistema»,
// ya queda bien aquí).
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.setAttribute("data-theme", "dark");
}

// Sin StrictMode a propósito: la doble ejecución de efectos en desarrollo
// duplica las entradas de historial que usa el botón atrás de Android.
createRoot(document.getElementById("root")!).render(<App />);

// El service worker solo se registra en la versión web. En el APK los archivos
// ya están dentro de la app y registrarlo solo serviría para servir copias
// viejas después de cada actualización.
if (!esNativo) {
  void import("virtual:pwa-register").then(({ registerSW }) =>
    registerSW({ immediate: true }),
  );
}
