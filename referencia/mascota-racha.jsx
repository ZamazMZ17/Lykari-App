import React, { useState } from "react";
import { Glasses, Dumbbell, Music, Video, Briefcase, PenLine, Flag, RotateCcw, Info } from "lucide-react";

/* ── tokens (mismos de la app) ───────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
.mz{
  --ground:#DCE0D9; --paper:#F3F5F0; --ink:#151A12; --ink2:#5D6656;
  --line:#C6CCC0; --pino:#1F4D3F; --ambar:#C98209;
  --musica:#7B4EA3; --video:#1E6E8C; --negocio:#A66200; --diario:#9C3F5C; --pend:#2F6B4F;
  font-family:'Instrument Sans',system-ui,sans-serif; color:var(--ink); background:var(--ground);
  -webkit-font-smoothing:antialiased;
}
.mz *{box-sizing:border-box}
.disp{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.02em}
.mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
.card{background:var(--paper);border:1px solid var(--line);border-radius:14px}
.btn{border:none;background:none;cursor:pointer;font-family:inherit;color:inherit}
.btn:focus-visible{outline:2px solid var(--pino);outline-offset:2px}

@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes breath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.018,.985)}}
@keyframes sway{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(4deg)}}
@keyframes blink{0%,93%,100%{transform:scaleY(0)}95%,97%{transform:scaleY(1)}}
@keyframes earL{0%,88%,100%{transform:rotate(0)}91%{transform:rotate(-7deg)}94%{transform:rotate(2deg)}}
@keyframes tilt{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.6deg)}}
@keyframes scarf{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}
.f-float{animation:float 5.5s ease-in-out infinite}
.f-breath{animation:breath 3.8s ease-in-out infinite;transform-origin:160px 320px}
.f-tail{animation:sway 5s ease-in-out infinite;transform-origin:228px 284px}
.f-blink{animation:blink 6.2s linear infinite;transform-origin:center top}
.f-ear{animation:earL 9s ease-in-out infinite;transform-origin:112px 140px}
.f-head{animation:tilt 7s ease-in-out infinite;transform-origin:160px 220px}
.f-scarf{animation:scarf 4.4s ease-in-out infinite;transform-origin:200px 224px}
@media (prefers-reduced-motion:reduce){
  .f-float,.f-breath,.f-tail,.f-blink,.f-ear,.f-head,.f-scarf{animation:none}
}
`;

/* ── semanas de ejemplo ──────────────────────────────────────────── */
const SEMANAS = [
  { n: 1, racha: 2, items: [], txt: "Dos días con registro. Sale como es: sin nada encima. No se gana ropa por instalar la app." },
  { n: 2, racha: 5, items: ["lentes"], txt: "Leíste cuatro de cinco días. Los lentes son lo único que se sostuvo lo suficiente." },
  { n: 3, racha: 9, items: ["lentes", "lapiz"], txt: "Grabaste el diario seis noches seguidas. La bufanda pasó su primer nudo." },
  { n: 4, racha: 14, items: ["lentes", "lapiz", "audifonos"], txt: "Cinco ideas de música en la semana. Segundo nudo." },
  { n: 5, racha: 3, items: ["lapiz"], txt: "Cuatro días sin abrir la app. Se cayeron los lentes y los audífonos. La bufanda se acortó, pero los dos nudos se quedan: eso ya lo hiciste y no se borra." },
  { n: 6, racha: 8, items: ["lentes", "lapiz", "pesa"], txt: "Volviste, y encima con tres sesiones de ejercicio. Primera vez que la pesa aparece." },
  { n: 7, racha: 15, items: ["lentes", "lapiz", "pesa", "bandera"], txt: "Inglés cinco días. La banderita es la más difícil de conseguir: pide constancia, no maratones." },
  { n: 8, racha: 23, items: ["lentes", "lapiz", "pesa", "bandera", "audifonos", "camara"], txt: "Semana completa. La cámara apareció porque grabaste ideas de video cuatro días distintos, no cuatro veces el mismo día." },
];

const PIEZAS = [
  { k: "lentes", nom: "Lentes", area: "Lectura", Icon: Glasses, color: "var(--pino)", regla: "Leer 4 de 7 días" },
  { k: "pesa", nom: "Pesa", area: "Ejercicio", Icon: Dumbbell, color: "var(--pend)", regla: "3 sesiones en la semana" },
  { k: "bandera", nom: "Banderín", area: "Inglés", Icon: Flag, color: "var(--video)", regla: "5 días distintos" },
  { k: "audifonos", nom: "Audífonos", area: "Música", Icon: Music, color: "var(--musica)", regla: "4 ideas grabadas" },
  { k: "camara", nom: "Cámara", area: "Video", Icon: Video, color: "var(--video)", regla: "Ideas en 4 días distintos" },
  { k: "maletin", nom: "Maletín", area: "Negocio", Icon: Briefcase, color: "var(--negocio)", regla: "Una idea con tareas hechas" },
  { k: "lapiz", nom: "Lápiz", area: "Diario", Icon: PenLine, color: "var(--diario)", regla: "6 noches de diario" },
];

/* ── la mascota ──────────────────────────────────────────────────── */
function Panda({ items = [], racha = 0, size = 320 }) {
  const has = (k) => items.includes(k);
  const largo = Math.min(96, 20 + racha * 3.1);
  const nudos = Math.floor(racha / 7);

  return (
    <svg viewBox="0 0 320 380" width={size} height={size * 380 / 320} role="img" aria-label="Mascota">
      <defs>
        <radialGradient id="gHead" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#E58C58" /><stop offset="55%" stopColor="#CB6135" /><stop offset="100%" stopColor="#A8431F" />
        </radialGradient>
        <radialGradient id="gBody" cx="40%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#D4713F" /><stop offset="60%" stopColor="#B45129" /><stop offset="100%" stopColor="#8E3A1B" />
        </radialGradient>
        <linearGradient id="gBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A3221" /><stop offset="100%" stopColor="#33190F" />
        </linearGradient>
        <radialGradient id="gCream" cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FDF6EA" /><stop offset="100%" stopColor="#E9D6BE" />
        </radialGradient>
        <radialGradient id="gEar" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#F6E4D3" /><stop offset="100%" stopColor="#DDBBA1" />
        </radialGradient>
        <radialGradient id="gGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".55" /><stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#2B1A0E" floodOpacity=".22" />
        </filter>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <clipPath id="cHead"><ellipse cx="160" cy="196" rx="76" ry="70" /></clipPath>
        <clipPath id="cBody"><ellipse cx="160" cy="292" rx="72" ry="62" /></clipPath>
      </defs>

      {/* halo */}
      <circle cx="160" cy="200" r="150" fill="url(#gGlow)" />
      <ellipse cx="160" cy="356" rx="86" ry="13" fill="#2B1A0E" opacity=".16" />

      <g className="f-float">
        {/* cola */}
        <g className="f-tail">
          <path d="M228 296 C 286 300, 312 250, 296 196" fill="none" stroke="#8E3A1B" strokeWidth="34" strokeLinecap="round" />
          <path d="M228 296 C 286 300, 312 250, 296 196" fill="none" stroke="url(#gBody)" strokeWidth="28" strokeLinecap="round" />
          <path d="M228 296 C 286 300, 312 250, 296 196" fill="none" stroke="#F2E2CC" strokeWidth="28"
            strokeDasharray="15 26" strokeDashoffset="-22" strokeLinecap="butt" opacity=".92" />
          <path d="M228 296 C 286 300, 312 250, 296 196" fill="none" stroke="#3A2015" strokeWidth="28"
            strokeDasharray="4 37" strokeDashoffset="-18" opacity=".18" />
          <circle cx="296" cy="194" r="14" fill="#3A2015" opacity=".9" />
        </g>

        <g className="f-breath" filter="url(#soft)">
          {/* patas traseras */}
          <ellipse cx="118" cy="342" rx="30" ry="19" fill="#3A2015" />
          <ellipse cx="202" cy="342" rx="30" ry="19" fill="#3A2015" />
          <g fill="#5A3524" opacity=".7">
            <circle cx="106" cy="340" r="4" /><circle cx="118" cy="336" r="4" /><circle cx="130" cy="340" r="4" />
            <circle cx="190" cy="340" r="4" /><circle cx="202" cy="336" r="4" /><circle cx="214" cy="340" r="4" />
          </g>

          {/* cuerpo */}
          <ellipse cx="160" cy="292" rx="72" ry="62" fill="url(#gBody)" />
          <g clipPath="url(#cBody)">
            <ellipse cx="160" cy="306" rx="46" ry="52" fill="url(#gBelly)" />
            <ellipse cx="160" cy="300" rx="34" ry="40" fill="#000" opacity=".14" />
            <rect x="88" y="230" width="144" height="130" fill="#fff" opacity=".05" />
          </g>

          {/* brazos */}
          <g fill="#3A2015">
            <ellipse cx="98" cy="292" rx="19" ry="36" transform="rotate(-10 98 292)" />
            <ellipse cx="222" cy="292" rx="19" ry="36" transform="rotate(10 222 292)" />
            <circle cx="93" cy="324" r="17" /><circle cx="227" cy="324" r="17" />
          </g>
        </g>

        {/* cabeza */}
        <g className="f-head">
          {/* orejas */}
          <g className="f-ear">
            <circle cx="108" cy="148" r="33" fill="#A8431F" />
            <circle cx="108" cy="150" r="27" fill="url(#gEar)" />
            <circle cx="108" cy="152" r="17" fill="#C98F73" opacity=".45" />
          </g>
          <g>
            <circle cx="212" cy="148" r="33" fill="#A8431F" />
            <circle cx="212" cy="150" r="27" fill="url(#gEar)" />
            <circle cx="212" cy="152" r="17" fill="#C98F73" opacity=".45" />
          </g>

          <ellipse cx="160" cy="196" rx="76" ry="70" fill="url(#gHead)" filter="url(#soft)" />

          <g clipPath="url(#cHead)">
            {/* cejas cremas */}
            <ellipse cx="126" cy="168" rx="20" ry="13" fill="url(#gCream)" transform="rotate(-14 126 168)" />
            <ellipse cx="194" cy="168" rx="20" ry="13" fill="url(#gCream)" transform="rotate(14 194 168)" />
            {/* mejillas */}
            <ellipse cx="100" cy="216" rx="26" ry="24" fill="url(#gCream)" />
            <ellipse cx="220" cy="216" rx="26" ry="24" fill="url(#gCream)" />
            {/* lágrimas rojizas */}
            <path d="M130 208 Q 124 226 120 240" stroke="#9B3C1C" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".5" />
            <path d="M190 208 Q 196 226 200 240" stroke="#9B3C1C" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".5" />
            {/* pelaje */}
            <g stroke="#F2E2CC" strokeWidth="2.2" strokeLinecap="round" opacity=".55">
              <path d="M86 200 l-12 -7" /><path d="M84 216 l-13 -2" /><path d="M88 230 l-12 5" />
              <path d="M234 200 l12 -7" /><path d="M236 216 l13 -2" /><path d="M232 230 l12 5" />
            </g>
            <ellipse cx="140" cy="158" rx="60" ry="40" fill="#fff" opacity=".07" />
          </g>

          {/* hocico */}
          <path d="M160 208 c 26 0 38 12 38 26 c 0 16 -18 26 -38 26 c -20 0 -38 -10 -38 -26 c 0 -14 12 -26 38 -26 z" fill="url(#gCream)" />
          <ellipse cx="160" cy="222" rx="11" ry="8.5" fill="#2A1712" />
          <ellipse cx="157" cy="219" rx="3.5" ry="2.4" fill="#fff" opacity=".35" />
          <path d="M160 231 v7" stroke="#2A1712" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M160 238 q -9 9 -17 2" stroke="#2A1712" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M160 238 q 9 9 17 2" stroke="#2A1712" strokeWidth="2.6" fill="none" strokeLinecap="round" />

          {/* ojos */}
          <g>
            <ellipse cx="132" cy="196" rx="11" ry="12" fill="#241410" />
            <ellipse cx="188" cy="196" rx="11" ry="12" fill="#241410" />
            <circle cx="136" cy="191" r="3.8" fill="#fff" opacity=".92" />
            <circle cx="192" cy="191" r="3.8" fill="#fff" opacity=".92" />
            <circle cx="128" cy="201" r="2" fill="#fff" opacity=".25" />
            <circle cx="184" cy="201" r="2" fill="#fff" opacity=".25" />
            <g className="f-blink">
              <rect x="120" y="182" width="24" height="16" fill="#CB6135" rx="7" />
              <rect x="176" y="182" width="24" height="16" fill="#CB6135" rx="7" />
            </g>
          </g>

          {/* lentes */}
          {has("lentes") && (
            <g stroke="#2E2119" strokeWidth="4.5" fill="rgba(255,255,255,.14)">
              <circle cx="132" cy="196" r="21" /><circle cx="188" cy="196" r="21" />
              <path d="M153 194 q 7 -5 14 0" fill="none" />
              <path d="M111 192 l-18 -6" fill="none" /><path d="M209 192 l18 -6" fill="none" />
            </g>
          )}

          {/* lápiz en la oreja */}
          {has("lapiz") && (
            <g transform="rotate(-28 100 150)">
              <rect x="72" y="140" width="58" height="11" rx="3" fill="#E0A72B" />
              <rect x="72" y="140" width="58" height="4" rx="2" fill="#fff" opacity=".28" />
              <path d="M130 140 l14 5.5 l-14 5.5 z" fill="#F0E2CE" />
              <path d="M139 143.6 l5 1.9 l-5 1.9 z" fill="#2A1712" />
              <rect x="62" y="140" width="12" height="11" rx="3" fill="#D9647A" />
            </g>
          )}

          {/* audífonos */}
          {has("audifonos") && (
            <g>
              <path d="M92 156 Q 160 78 228 156" stroke="#2E2119" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M92 156 Q 160 78 228 156" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".16" />
              <rect x="76" y="146" width="30" height="50" rx="14" fill="#2E2119" />
              <rect x="214" y="146" width="30" height="50" rx="14" fill="#2E2119" />
              <rect x="82" y="154" width="18" height="34" rx="9" fill="var(--musica)" />
              <rect x="220" y="154" width="18" height="34" rx="9" fill="var(--musica)" />
            </g>
          )}
        </g>

        {/* bufanda de racha */}
        {racha > 0 && (
          <g>
            <path d="M104 262 Q 160 288 216 262" stroke="#1F4D3F" strokeWidth="22" fill="none" strokeLinecap="round" />
            <path d="M104 262 Q 160 288 216 262" stroke="#F2E2CC" strokeWidth="22" fill="none"
              strokeDasharray="5 30" strokeDashoffset="-14" opacity=".85" />
            <g className="f-scarf">
              <path d={`M204 272 q 10 ${largo / 2} 2 ${largo}`} stroke="#1F4D3F" strokeWidth="19" fill="none" strokeLinecap="round" />
              <path d={`M204 272 q 10 ${largo / 2} 2 ${largo}`} stroke="#F2E2CC" strokeWidth="19" fill="none"
                strokeDasharray="5 26" strokeDashoffset="-10" opacity=".85" />
              {Array.from({ length: nudos }).map((_, i) => (
                <circle key={i} cx={207 + i * 1.5} cy={286 + (i + 1) * (largo / (nudos + 1))} r="7.5" fill="#C98209" stroke="#1F4D3F" strokeWidth="2.5" />
              ))}
            </g>
          </g>
        )}

        {/* pesa */}
        {has("pesa") && (
          <g transform="rotate(-8 93 324)">
            <rect x="45" y="320" width="96" height="9" rx="4.5" fill="#565C55" />
            <rect x="45" y="320" width="96" height="3" rx="1.5" fill="#fff" opacity=".22" />
            <rect x="38" y="303" width="16" height="43" rx="5" fill="#2E332C" />
            <rect x="132" y="303" width="16" height="43" rx="5" fill="#2E332C" />
            <rect x="80" y="308" width="14" height="33" rx="6" fill="#2F6B4F" />
          </g>
        )}

        {/* banderín de inglés */}
        {has("bandera") && (
          <g>
            <rect x="243" y="238" width="5" height="92" rx="2.5" fill="#6B5B4A" />
            <g>
              <rect x="248" y="240" width="52" height="34" fill="#1E3D7B" />
              <path d="M248 240 L300 274 M300 240 L248 274" stroke="#F2E2CC" strokeWidth="7" />
              <path d="M248 240 L300 274 M300 240 L248 274" stroke="#B5232E" strokeWidth="3.4" />
              <path d="M274 240 v34 M248 257 h52" stroke="#F2E2CC" strokeWidth="10" />
              <path d="M274 240 v34 M248 257 h52" stroke="#B5232E" strokeWidth="5.6" />
              <rect x="248" y="240" width="52" height="34" fill="none" stroke="#2A1712" strokeWidth="1.4" opacity=".35" />
            </g>
          </g>
        )}

        {/* cámara */}
        {has("camara") && (
          <g>
            <path d="M112 258 Q 160 300 208 258" stroke="#2E2119" strokeWidth="6" fill="none" />
            <rect x="130" y="292" width="60" height="42" rx="9" fill="#21262A" />
            <rect x="146" y="286" width="24" height="9" rx="3" fill="#21262A" />
            <circle cx="160" cy="313" r="15" fill="#0E1114" />
            <circle cx="160" cy="313" r="10" fill="none" stroke="#1E6E8C" strokeWidth="3" />
            <circle cx="155" cy="308" r="3" fill="#fff" opacity=".5" />
            <rect x="176" y="298" width="7" height="5" rx="2" fill="#C98209" />
          </g>
        )}

        {/* maletín */}
        {has("maletin") && (
          <g>
            <path d="M222 316 q 12 -14 24 0" stroke="#4A2E13" strokeWidth="4.5" fill="none" />
            <rect x="212" y="316" width="62" height="44" rx="7" fill="#8A5A22" />
            <rect x="212" y="316" width="62" height="10" rx="5" fill="#fff" opacity=".14" />
            <rect x="212" y="334" width="62" height="5" fill="#5E3B12" />
            <rect x="236" y="330" width="14" height="12" rx="3" fill="#D8B06A" />
          </g>
        )}

        <rect x="0" y="0" width="320" height="380" filter="url(#grain)" opacity=".05" style={{ mixBlendMode: "multiply" }} />
      </g>
    </svg>
  );
}

/* ── prototipo ───────────────────────────────────────────────────── */
export default function App() {
  const [i, setI] = useState(7);
  const [manual, setManual] = useState(null);
  const s = SEMANAS[i];
  const items = manual || s.items;
  const nudos = Math.floor(s.racha / 7);

  const toggle = (k) => {
    const base = manual || s.items;
    setManual(base.includes(k) ? base.filter((x) => x !== k) : [...base, k]);
  };

  return (
    <div className="mz" style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "0 0 40px" }}>
      <style>{CSS}</style>
      <div style={{ width: "100%", maxWidth: 430, padding: "0 18px" }}>

        <div style={{ padding: "22px 2px 8px" }}>
          <div className="eyebrow">Camino · tu constancia</div>
          <h1 className="disp" style={{ fontSize: 27, margin: "4px 0 0" }}>La bufanda</h1>
        </div>

        {/* escenario */}
        <div className="card" style={{ padding: "10px 0 0", overflow: "hidden", position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 38%, #EDEFE8 0%, #DCE0D9 62%, #CBD1C6 100%)"
          }} />
          <div style={{ position: "relative", display: "grid", placeItems: "center", paddingBottom: 6 }}>
            <Panda items={items} racha={s.racha} size={300} />
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 14, padding: "0 18px 16px" }}>
            <div>
              <div className="mono" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{s.racha}</div>
              <div className="eyebrow" style={{ marginTop: 3 }}>días con registro</div>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 13, color: "var(--ink2)" }}>
                {nudos} {nudos === 1 ? "nudo" : "nudos"} · semana {s.n}
              </div>
            </div>
          </div>
        </div>

        {/* línea de semanas */}
        <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
          {SEMANAS.map((w, k) => (
            <button key={w.n} className="btn" onClick={() => { setI(k); setManual(null); }} style={{
              flex: 1, padding: "9px 0 8px", borderRadius: 10, border: `1px solid ${i === k ? "var(--ink)" : "var(--line)"}`,
              background: i === k ? "var(--ink)" : "var(--paper)", color: i === k ? "var(--paper)" : "var(--ink2)"
            }}>
              <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{w.n}</div>
              <div style={{
                height: 3, width: `${Math.max(12, Math.min(100, w.racha * 4))}%`, margin: "5px auto 0",
                background: i === k ? "var(--ambar)" : "var(--pino)", borderRadius: 2, opacity: i === k ? 1 : .5
              }} />
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink2)", margin: "14px 2px 0" }}>{s.txt}</p>

        {/* piezas */}
        <div className="eyebrow" style={{ margin: "22px 2px 9px" }}>Lo que se pone y por qué</div>
        <div style={{ display: "grid", gap: 7 }}>
          {PIEZAS.map(({ k, nom, area, Icon, color, regla }) => {
            const on = items.includes(k);
            return (
              <button key={k} className="btn card" onClick={() => toggle(k)} style={{
                padding: "11px 13px", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                borderColor: on ? color : "var(--line)", opacity: on ? 1 : .62
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center",
                  background: on ? color : "transparent", border: on ? "none" : "1px solid var(--line)"
                }}>
                  <Icon size={16} strokeWidth={1.8} color={on ? "var(--paper)" : "var(--ink2)"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{nom} <span style={{ color: "var(--ink2)", fontWeight: 400 }}>· {area}</span></div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--ink2)", marginTop: 2 }}>{regla}</div>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: on ? color : "var(--ink2)" }}>{on ? "PUESTO" : "—"}</div>
              </button>
            );
          })}
        </div>

        {manual && (
          <button className="btn" onClick={() => setManual(null)} style={{
            marginTop: 10, fontSize: 12.5, color: "var(--ink2)", display: "flex", gap: 6, alignItems: "center"
          }}><RotateCcw size={13} /> Volver a lo que dice la semana {s.n}</button>
        )}

        {/* reglas */}
        <div className="card" style={{ marginTop: 20, padding: "15px 16px" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 12 }}>
            <Info size={15} color="var(--ink2)" />
            <div className="eyebrow">Cómo funciona la racha</div>
          </div>
          {[
            ["Cuenta días con registro, no días perfectos.", "Abrir la app y cerrar una sesión de diez minutos cuenta. La racha mide que apareciste, no cuánto rendiste."],
            ["Tienes un día libre por semana.", "Descansar es parte del sistema. Un día sin nada no rompe nada; dos seguidos sí."],
            ["Al romperse no vuelve a cero.", "La bufanda se acorta, pero los nudos ganados se quedan puestos. Lo que ya hiciste no se borra por fallar después."],
            ["La ropa se recalcula cada lunes.", "Si dejaste de leer, los lentes se caen esa semana. La mascota muestra lo que estás haciendo ahora, no tu mejor mes."],
          ].map(([t, d], k, arr) => (
            <div key={t} style={{ paddingBottom: k === arr.length - 1 ? 0 : 12, marginBottom: k === arr.length - 1 ? 0 : 12, borderBottom: k === arr.length - 1 ? "none" : "1px solid var(--line)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, marginTop: 3 }}>{d}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 8, padding: "15px 16px", borderStyle: "dashed" }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>Lo que nunca hace</div>
          <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.65 }}>
            <li>No pone cara triste ni llora para que vuelvas.</li>
            <li>No manda notificaciones de culpa.</li>
            <li>No te felicita por días vacíos: si no hay registro, sale sin nada y ya.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
