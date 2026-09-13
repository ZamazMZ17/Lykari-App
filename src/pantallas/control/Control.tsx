/**
 * Placeholder mínimo: la UI real de Control la construye otro encargo
 * (`codex/control-ui`, ver docs/coordinacion.md). Esto solo evita que la
 * pestaña "Control" de Zamly quede vacía mientras tanto.
 */
export function Control() {
  return (
    <div className="card" style={{ padding: 16, textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--ink2)", margin: 0, lineHeight: 1.5 }}>
        Control de tiempo en pantalla — en construcción.
      </p>
    </div>
  );
}
