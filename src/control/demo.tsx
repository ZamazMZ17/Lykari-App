import { createRoot } from "react-dom/client";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "../estilos.css";
import { Control } from "../pantallas/control/Control";

// Entrada aislada, excluida de las entradas de producción de Vite.
if (import.meta.env.DEV) {
  const mock = localStorage.getItem("lykariControlMock") === "1";
  createRoot(document.getElementById("root")!).render(<main className="ct-demo">
    <div className="eyebrow">Privado · LyKari</div><h1 className="disp">Control</h1>
    <div className="control-ui" style={{ marginBottom: 18 }}><button className="ct-btn" onClick={() => {
      localStorage.setItem("lykariControlMock", mock ? "0" : "1");
      location.reload();
    }}>{mock ? "Salir de la demostración" : "Activar demostración"}</button></div>
    <Control />
  </main>);
}
