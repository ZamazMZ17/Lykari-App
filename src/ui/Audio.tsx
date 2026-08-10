import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { duracionAudio } from "../lib/grabacion";

/** Escuchar lo que grabaste. El audio original nunca se convierte ni se pierde. */
export function Reproductor({
  blob,
  duracionMs,
  color = "var(--ink2)",
}: {
  blob: Blob;
  duracionMs?: number;
  color?: string;
}) {
  const [sonando, setSonando] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    el.onended = () => setSonando(false);
    el.onpause = () => setSonando(false);
    audio.current = el;
    return () => {
      el.pause();
      URL.revokeObjectURL(url);
      audio.current = null;
    };
  }, [blob]);

  return (
    <button
      className="btn chip"
      onClick={(e) => {
        e.stopPropagation();
        const el = audio.current;
        if (!el) return;
        if (sonando) {
          el.pause();
        } else {
          void el.play();
          setSonando(true);
        }
      }}
      style={{ display: "flex", gap: 6, alignItems: "center", padding: "5px 10px", color }}
    >
      {sonando ? <Pause size={12} /> : <Play size={12} />}
      <span className="mono" style={{ fontSize: 11 }}>
        {duracionMs ? duracionAudio(duracionMs) : "audio"}
      </span>
    </button>
  );
}
