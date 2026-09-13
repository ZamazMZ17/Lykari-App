import { useState } from "react";
import { verificarContrasena } from "../../db/zamly";
import { Aviso, Editor, useAccion } from "./comun";

export function ConfirmarContrasena({ titulo, detalle, confirmar, onConfirmar, onClose }: {
  titulo: string; detalle: string; confirmar: string; onConfirmar: () => Promise<void>; onClose: () => void;
}) {
  const [contrasena, setContrasena] = useState("");
  const accion = useAccion();
  return <Editor titulo={titulo} onClose={onClose}><form className="ct-form" onSubmit={(e) => {
    e.preventDefault();
    void accion.ejecutar(async () => {
      if (!await verificarContrasena(contrasena)) throw new Error("Contraseña incorrecta.");
      await onConfirmar(); onClose();
    });
  }}>
    <p>{detalle}</p><label>Contraseña de Zamly<input type="password" required autoComplete="current-password" value={contrasena} disabled={accion.ocupado} onChange={(e) => setContrasena(e.target.value)} /></label>
    <Aviso error={accion.error} /><button className="ct-btn ct-primario" disabled={accion.ocupado}>{accion.ocupado ? "Verificando…" : confirmar}</button>
  </form></Editor>;
}
