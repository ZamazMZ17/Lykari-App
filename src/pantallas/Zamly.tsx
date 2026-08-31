import { useEffect, useState } from "react";
import { AlertTriangle, Lock, Trophy } from "lucide-react";
import {
  establecerContrasena,
  eventosRecientes,
  msDeRachaActual,
  obtenerRacha,
  registrarRecaida,
  tieneContrasena,
  verificarContrasena,
} from "../db/zamly";
import type { ZamlyEvento, ZamlyRacha } from "../db/db";
import { HORA } from "../lib/tiempo";
import { useTic } from "../lib/ganchos";
import { BotonPrincipal, Hoja } from "../ui/piezas";

function diasHoras(ms: number): { dias: number; horas: number } {
  const totalHoras = Math.floor(ms / HORA);
  return { dias: Math.floor(totalHoras / 24), horas: totalHoras % 24 };
}

const fechaHora = (ms: number) =>
  new Date(ms).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** La hoja se cierra sola al tocar fuera de la parte desbloqueada, como el resto de la app. */
export function Zamly({ onClose }: { onClose: () => void }) {
  const [estado, setEstado] = useState<"cargando" | "crear" | "ingresar" | "adentro">("cargando");
  const [valor, setValor] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void tieneContrasena().then((si) => setEstado(si ? "ingresar" : "crear"));
  }, []);

  const enviarCrear = async () => {
    if (valor.length < 4) return setError("Al menos 4 caracteres.");
    if (valor !== confirmar) return setError("No coinciden.");
    await establecerContrasena(valor);
    setEstado("adentro");
  };

  const enviarIngresar = async () => {
    const ok = await verificarContrasena(valor);
    if (!ok) return setError("Contraseña incorrecta.");
    setEstado("adentro");
  };

  if (estado === "cargando") return null;

  if (estado === "adentro") {
    return <ZamlyAdentro onClose={onClose} />;
  }

  return (
    <Hoja onClose={onClose} eyebrow="Privado" titulo={estado === "crear" ? "Crear contraseña" : "Acceso privado"}>
      <div style={{ display: "grid", placeItems: "center", margin: "8px 0 18px" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: "var(--tinte-pino)",
          }}
        >
          <Lock size={22} color="var(--pino)" />
        </div>
      </div>
      <input
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setError("");
        }}
        type="password"
        autoComplete="off"
        autoFocus
        placeholder="Contraseña"
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--ground)",
          fontSize: 15,
          marginBottom: estado === "crear" ? 10 : 8,
        }}
      />
      {estado === "crear" && (
        <input
          value={confirmar}
          onChange={(e) => {
            setConfirmar(e.target.value);
            setError("");
          }}
          type="password"
          autoComplete="off"
          placeholder="Repetila"
          style={{
            width: "100%",
            padding: "13px 14px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--ground)",
            fontSize: 15,
            marginBottom: 8,
          }}
        />
      )}
      {error && <p style={{ fontSize: 12.5, color: "var(--ink2)", margin: "0 0 12px" }}>{error}</p>}
      <BotonPrincipal onClick={() => void (estado === "crear" ? enviarCrear() : enviarIngresar())}>
        {estado === "crear" ? "Crear y entrar" : "Entrar"}
      </BotonPrincipal>
    </Hoja>
  );
}

function ZamlyAdentro({ onClose }: { onClose: () => void }) {
  const [racha, setRacha] = useState<ZamlyRacha | null>(null);
  const [eventos, setEventos] = useState<ZamlyEvento[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [nota, setNota] = useState("");
  const ahora = useTic(true, 60_000);

  const recargar = async () => {
    setRacha(await obtenerRacha());
    setEventos(await eventosRecientes());
  };

  useEffect(() => {
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!racha) return null;

  const { dias, horas } = diasHoras(msDeRachaActual(racha, ahora));
  const { dias: diasRecord } = diasHoras(racha.mejorRachaMs);

  const confirmarRecaida = async () => {
    await registrarRecaida(nota);
    setNota("");
    setConfirmando(false);
    await recargar();
  };

  return (
    <Hoja onClose={onClose} eyebrow="Privado" titulo="Racha">
      <div style={{ display: "grid", placeItems: "center", margin: "6px 0 6px" }}>
        <div className="mono" style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
          {dias}
        </div>
        <div className="eyebrow" style={{ marginTop: 4 }}>
          {dias === 1 ? "día" : "días"} · {horas} h
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: "11px 13px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "18px 0",
        }}
      >
        <Trophy size={16} color="var(--ambar)" />
        <div style={{ flex: 1, fontSize: 13 }}>Récord</div>
        <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
          {diasRecord} {diasRecord === 1 ? "día" : "días"}
        </div>
      </div>

      {confirmando ? (
        <div className="card" style={{ padding: 14, borderStyle: "dashed", marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5, margin: "0 0 10px" }}>
            La racha se reinicia. El récord queda guardado.
          </p>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota opcional"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--ground)",
              fontSize: 13.5,
              marginBottom: 10,
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              onClick={() => setConfirmando(false)}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 13.5,
              }}
            >
              Cancelar
            </button>
            <button
              className="btn"
              onClick={() => void confirmarRecaida()}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                border: "1px solid var(--line)",
                color: "var(--ink2)",
                fontSize: 13.5,
              }}
            >
              Sí, registrar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn"
          onClick={() => setConfirmando(true)}
          style={{
            width: "100%",
            padding: "13px 0",
            marginBottom: 20,
            borderRadius: 14,
            border: "1px solid var(--line)",
            display: "flex",
            gap: 8,
            justifyContent: "center",
            alignItems: "center",
            fontSize: 14,
            color: "var(--ink2)",
          }}
        >
          <AlertTriangle size={15} /> Registrar recaída
        </button>
      )}

      {eventos.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Historial
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {eventos.map((e) => (
              <div
                key={e.id}
                className="card"
                style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span className="mono" style={{ fontSize: 12, color: "var(--ink2)" }}>
                  {fechaHora(e.fecha)}
                </span>
                {e.nota && <span style={{ fontSize: 13 }}>{e.nota}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </Hoja>
  );
}
