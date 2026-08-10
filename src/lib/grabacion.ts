import { useCallback, useEffect, useRef, useState } from "react";
import { esNativo } from "./plataforma";

export type EstadoGrabacion = "inactiva" | "pidiendo" | "grabando" | "error";

export interface Grabacion {
  blob: Blob;
  duracionMs: number;
}

/** Cuántas barras tiene la onda que se dibuja mientras habla. */
const BARRAS = 26;

/**
 * El navegador decide el formato. Se guarda tal cual lo grabó — es el
 * original — y la conversión a lo que acepte la IA se hace al enviar.
 */
function mejorFormato(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidatos = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Se pide el micrófono a secas. Pedir cancelación de eco pone a Android en
 * modo «comunicación» y en algunos teléfonos la WebView no consigue enrutar el
 * micrófono («Unable to select communication device»), además de dejar el
 * dispositivo a medio abrir y hacer fallar el siguiente intento. Para notas de
 * voz esos filtros no aportan nada.
 */
async function abrirMicrofono(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    if (e instanceof DOMException && e.name === "NotAllowedError") throw e;
    // Un segundo intento tras soltar el hilo: si el fallo fue por un
    // dispositivo que quedó ocupado, suele bastar con esperar un momento.
    await new Promise((r) => setTimeout(r, 400));
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

export function useGrabadora() {
  const [estado, setEstado] = useState<EstadoGrabacion>("inactiva");
  const [ms, setMs] = useState(0);
  const [onda, setOnda] = useState<number[]>(() => new Array(BARRAS).fill(0));
  const [error, setError] = useState<string | null>(null);

  const rec = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);
  const pista = useRef<MediaStream | null>(null);
  const contexto = useRef<AudioContext | null>(null);
  const cuadro = useRef<number>(0);
  const inicio = useRef(0);
  const reloj = useRef<number>(0);

  const limpiar = useCallback(() => {
    cancelAnimationFrame(cuadro.current);
    clearInterval(reloj.current);
    pista.current?.getTracks().forEach((t) => t.stop());
    pista.current = null;
    void contexto.current?.close();
    contexto.current = null;
    rec.current = null;
  }, []);

  useEffect(() => limpiar, [limpiar]);

  const iniciar = useCallback(async () => {
    if (rec.current) return;
    setError(null);
    setEstado("pidiendo");
    try {
      const stream = await abrirMicrofono();
      pista.current = stream;

      const tipo = mejorFormato();
      const grabadora = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      trozos.current = [];
      grabadora.ondataavailable = (e) => {
        if (e.data.size > 0) trozos.current.push(e.data);
      };
      grabadora.start(250);
      rec.current = grabadora;

      inicio.current = Date.now();
      setMs(0);
      reloj.current = window.setInterval(() => setMs(Date.now() - inicio.current), 200);

      // Onda en vivo: sin esto no hay forma de saber si el micrófono agarra.
      const ctx = new AudioContext();
      contexto.current = ctx;
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analizador);
      const datos = new Uint8Array(analizador.frequencyBinCount);

      const medir = () => {
        analizador.getByteTimeDomainData(datos);
        let suma = 0;
        for (const v of datos) {
          const d = (v - 128) / 128;
          suma += d * d;
        }
        const rms = Math.sqrt(suma / datos.length);
        setOnda((prev) => [...prev.slice(1), Math.min(1, rms * 3.2)]);
        cuadro.current = requestAnimationFrame(medir);
      };
      cuadro.current = requestAnimationFrame(medir);

      setEstado("grabando");
    } catch (e) {
      limpiar();
      setEstado("error");
      const sinPermiso =
        e instanceof DOMException &&
        (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(
        sinPermiso
          ? esNativo
            ? "Falta el permiso del micrófono. Actívalo en Ajustes de Android → Lykari → Permisos."
            : "No diste permiso al micrófono. Actívalo en los ajustes del navegador."
          : // El nombre del error importa: sin él no hay forma de saber si fue
            // el micrófono ocupado por otra app o algo del dispositivo.
            `No se pudo abrir el micrófono${e instanceof DOMException ? ` (${e.name})` : ""}.`,
      );
    }
  }, [limpiar]);

  const detener = useCallback(async (): Promise<Grabacion | null> => {
    const grabadora = rec.current;
    if (!grabadora || grabadora.state === "inactive") {
      limpiar();
      setEstado("inactiva");
      return null;
    }
    const duracionMs = Date.now() - inicio.current;
    const blob = await new Promise<Blob>((resolve) => {
      grabadora.onstop = () =>
        resolve(new Blob(trozos.current, { type: grabadora.mimeType || "audio/webm" }));
      grabadora.stop();
    });
    limpiar();
    setEstado("inactiva");
    setOnda(new Array(BARRAS).fill(0));
    setMs(0);
    return blob.size > 0 ? { blob, duracionMs } : null;
  }, [limpiar]);

  const cancelar = useCallback(() => {
    if (rec.current && rec.current.state !== "inactive") {
      rec.current.onstop = null;
      rec.current.stop();
    }
    trozos.current = [];
    limpiar();
    setEstado("inactiva");
    setOnda(new Array(BARRAS).fill(0));
    setMs(0);
  }, [limpiar]);

  return { estado, ms, onda, error, iniciar, detener, cancelar };
}

/** m:ss — la duración de un audio, no del cronómetro de sesión. */
export function duracionAudio(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
