import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useState } from "react";
import type { BloqueCurso, Curso, Modalidad } from "../db/db";
import type { NuevoCurso as Datos } from "../db/cursos";
import { aISO, hoyISO, NOMBRES_SEMANA_CORTOS } from "../lib/fecha";
import { BotonPrincipal, Hoja } from "../ui/piezas";

const MODALIDADES: [Modalidad, string][] = [
  ["presencial", "Presencial"],
  ["semipresencial", "Semipresencial"],
  ["distancia", "A distancia"],
];

const campo: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 11,
  border: "1px solid var(--line)",
  background: "var(--ground)",
  fontSize: 14,
};

const bloqueVacio = (): BloqueCurso => ({ dia: 0, horaInicio: "08:00", horaFin: "10:00", salon: "" });

/**
 * Los campos, sin la `Hoja` que los envuelve — igual que `FormularioActividad`,
 * para poder pasar de ver a editar dentro de una misma hoja abierta sin
 * romper la cuenta de historial que usa `useAtras`.
 */
export function FormularioCurso({
  inicial,
  onGuardar,
}: {
  inicial?: Curso;
  onGuardar: (datos: Datos) => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [codigo, setCodigo] = useState(inicial?.codigo ?? "");
  const [desde, setDesde] = useState(inicial?.desde ?? hoyISO());
  const [hasta, setHasta] = useState(inicial?.hasta ?? aISO(new Date(new Date().getFullYear(), 11, 20)));
  const [bloques, setBloques] = useState<BloqueCurso[]>(
    inicial?.bloques && inicial.bloques.length > 0 ? inicial.bloques : [bloqueVacio()],
  );

  const [masDetalles, setMasDetalles] = useState(
    !!(inicial?.profesor || inicial?.nrc || inicial?.aad || inicial?.modalidad || inicial?.creditos || inicial?.formulaNota),
  );
  const [nrc, setNrc] = useState(inicial?.nrc ?? "");
  const [profesor, setProfesor] = useState(inicial?.profesor ?? "");
  const [aad, setAad] = useState(inicial?.aad ?? "");
  const [modalidad, setModalidad] = useState<Modalidad | undefined>(inicial?.modalidad);
  const [creditos, setCreditos] = useState(inicial?.creditos ?? 0);
  const [formulaNota, setFormulaNota] = useState(inicial?.formulaNota ?? "");

  const cambiarBloque = (i: number, cambios: Partial<BloqueCurso>) => {
    setBloques(bloques.map((b, j) => (j === i ? { ...b, ...cambios } : b)));
  };

  const listo = nombre.trim().length > 0 && desde <= hasta && bloques.length > 0;

  return (
    <>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del curso"
        autoFocus
        style={{ ...campo, marginBottom: 10, fontSize: 15 }}
      />
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Código (opcional)"
        style={{ ...campo, marginBottom: 18, fontFamily: "'JetBrains Mono Variable', monospace" }}
      />

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Ciclo
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 4 }}>Del</div>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={campo} />
        </label>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 4 }}>Al</div>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={campo} />
        </label>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Horarios
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {bloques.map((b, i) => (
          <div key={i} className="card" style={{ padding: "12px 13px" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {NOMBRES_SEMANA_CORTOS.map((n, idx) => (
                <button
                  key={n}
                  className="btn"
                  onClick={() => cambiarBloque(i, { dia: idx })}
                  aria-pressed={b.dia === idx}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 8,
                    fontSize: 11,
                    border: `1px solid ${b.dia === idx ? "var(--pino)" : "var(--line)"}`,
                    background: b.dia === idx ? "var(--pino)" : "transparent",
                    color: b.dia === idx ? "var(--paper)" : "var(--ink2)",
                  }}
                >
                  {n}
                </button>
              ))}
              {bloques.length > 1 && (
                <button
                  className="btn"
                  onClick={() => setBloques(bloques.filter((_, j) => j !== i))}
                  aria-label="Quitar este horario"
                  style={{ color: "var(--ink2)", flexShrink: 0, paddingLeft: 6 }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="time"
                value={b.horaInicio}
                onChange={(e) => cambiarBloque(i, { horaInicio: e.target.value })}
                style={{ ...campo, flex: 1 }}
              />
              <input
                type="time"
                value={b.horaFin}
                onChange={(e) => cambiarBloque(i, { horaFin: e.target.value })}
                style={{ ...campo, flex: 1 }}
              />
            </div>
            <input
              value={b.salon ?? ""}
              onChange={(e) => cambiarBloque(i, { salon: e.target.value })}
              placeholder="Salón (opcional)"
              style={{ ...campo, marginTop: 8 }}
            />
          </div>
        ))}
      </div>
      <button
        className="btn chip"
        onClick={() => setBloques([...bloques, bloqueVacio()])}
        style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 22 }}
      >
        <Plus size={13} /> Agregar horario
      </button>

      <button
        className="btn"
        onClick={() => setMasDetalles(!masDetalles)}
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: masDetalles ? 14 : 22,
          fontSize: 13,
          color: "var(--ink2)",
        }}
      >
        {masDetalles ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        Más detalles del curso
      </button>

      {masDetalles && (
        <div style={{ marginBottom: 22 }}>
          <input
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
            placeholder="Profesor (opcional)"
            style={{ ...campo, marginBottom: 10 }}
          />
          <input
            value={aad}
            onChange={(e) => setAad(e.target.value)}
            placeholder="AAD / ayudante (opcional)"
            style={{ ...campo, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              value={nrc}
              onChange={(e) => setNrc(e.target.value)}
              placeholder="NRC (opcional)"
              style={{ ...campo, flex: 1, fontFamily: "'JetBrains Mono Variable', monospace" }}
            />
            <div
              className="card"
              style={{
                flex: 1,
                padding: "0 6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                className="btn"
                onClick={() => setCreditos(Math.max(0, creditos - 1))}
                aria-label="Menos un crédito"
                style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--line)" }}
              >
                −
              </button>
              <div className="mono" style={{ flex: 1, textAlign: "center", fontSize: 13 }}>
                {creditos > 0 ? `${creditos} créd.` : "sin créditos"}
              </div>
              <button
                className="btn"
                onClick={() => setCreditos(creditos + 1)}
                aria-label="Más un crédito"
                style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--line)" }}
              >
                +
              </button>
            </div>
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Modalidad
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {MODALIDADES.map(([k, l]) => (
              <button
                key={k}
                className="btn"
                onClick={() => setModalidad(modalidad === k ? undefined : k)}
                aria-pressed={modalidad === k}
                style={{
                  flex: 1,
                  padding: "9px 4px",
                  borderRadius: 10,
                  fontSize: 12,
                  border: `1px solid ${modalidad === k ? "var(--ink)" : "var(--line)"}`,
                  background: modalidad === k ? "var(--ink)" : "transparent",
                  color: modalidad === k ? "var(--paper)" : "var(--ink2)",
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Fórmula de la nota final (opcional)
          </div>
          <textarea
            value={formulaNota}
            onChange={(e) => setFormulaNota(e.target.value)}
            placeholder="NF = 0.10·PC1 + 0.10·TB1 + 0.20·EA1 + …"
            rows={2}
            style={{
              ...campo,
              fontFamily: "'JetBrains Mono Variable', monospace",
              fontSize: 12.5,
              resize: "vertical",
            }}
          />
          <p style={{ fontSize: 11.5, color: "var(--ink2)", margin: "6px 0 0" }}>
            Tal cual la trae el sílabo.
          </p>
        </div>
      )}

      <BotonPrincipal
        disabled={!listo}
        onClick={() =>
          onGuardar({
            nombre,
            codigo: codigo.trim() || undefined,
            desde,
            hasta,
            bloques,
            nrc: nrc.trim() || undefined,
            profesor: profesor.trim() || undefined,
            aad: aad.trim() || undefined,
            modalidad,
            creditos: creditos > 0 ? creditos : undefined,
            formulaNota: formulaNota.trim() || undefined,
          })
        }
      >
        {inicial ? "Guardar cambios" : "Agregar curso"}
      </BotonPrincipal>
    </>
  );
}

export function NuevoCurso({
  onClose,
  onGuardar,
}: {
  onClose: () => void;
  onGuardar: (datos: Datos) => void;
}) {
  return (
    <Hoja onClose={onClose} eyebrow="Horario" titulo="Nuevo curso">
      <FormularioCurso onGuardar={onGuardar} />
    </Hoja>
  );
}
