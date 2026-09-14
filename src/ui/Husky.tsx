import { useId } from "react";
import type { PiezaKey } from "../db/mascota";
import "./Husky.css";

/** Pelaje de color fijo para conservar el contraste en ambos temas. */
const TINTA = "#20282C";
const NIEVE = "#F8FAF6";
const CABEZA = "M78 139 C73 91 107 64 160 64 C213 64 247 91 242 139 L252 172 L237 169 L243 186 L222 182 C209 210 184 225 160 225 C136 225 111 210 98 182 L77 186 L83 169 L68 172 Z";

function Materiales({ id }: { id: string }) {
  return <defs>
    <radialGradient id={`${id}-pelo`} cx="32%" cy="18%" r="85%">
      <stop stopColor="#78848A" /><stop offset=".5" stopColor="#444F56" /><stop offset="1" stopColor="#222D34" />
    </radialGradient>
    <radialGradient id={`${id}-nieve`} cx="38%" cy="20%" r="85%">
      <stop stopColor="#FFFFFF" /><stop offset=".65" stopColor={NIEVE} /><stop offset="1" stopColor="#CED8D7" />
    </radialGradient>
    <linearGradient id={`${id}-bufanda`} x2=".8" y2="1">
      <stop stopColor="#E6AF49" /><stop offset=".55" stopColor="#C98209" /><stop offset="1" stopColor="#96621A" />
    </linearGradient>
    <clipPath id={`${id}-cara`}><path d={CABEZA} /></clipPath>
  </defs>;
}

function Cara({ id, piezas, atento = false }: { id: string; piezas: PiezaKey[]; atento?: boolean }) {
  return <g>
    <g className="husky-oreja">
      <path d="M88 111 Q66 66 79 24 Q113 34 135 86Z" fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 89 Q79 58 85 41 Q107 52 118 80Z" fill="#AAB4B6" />
      <path d="M89 78 L85 48 L111 77 L99 71 L102 86Z" fill={NIEVE} />
    </g>
    <path d="M185 86 Q207 34 241 24 Q254 66 232 111Z" fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
    <path d="M202 80 Q213 52 235 41 Q241 58 230 89Z" fill="#AAB4B6" />
    <path d="M218 86 L221 71 L209 77 L235 48 L231 78Z" fill={NIEVE} />
    <path d={CABEZA} fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
    <g clipPath={`url(#${id}-cara)`}>
      <path d="M78 154 Q85 110 115 110 Q135 114 147 145 L160 162 L173 145 Q185 114 205 110 Q235 110 242 154 L251 195 L206 233 L112 233 L69 191Z" fill={`url(#${id}-nieve)`} />
      <path d="M160 67 Q151 106 152 135 L160 152 L168 135 Q169 106 160 67Z" fill={NIEVE} />
      <path d="M82 156 L105 166 L88 169 M238 156 L215 166 L232 169" fill="none" stroke="#D2DCD9" strokeWidth="2" strokeLinecap="round" />
    </g>
    <path d="M107 126 Q116 121 125 125 M195 125 Q204 121 213 126" stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" />
    <g className="husky-ojos">
      <ellipse cx="119" cy="144" rx="11" ry={atento ? 10 : 13} fill={TINTA} /><ellipse cx="201" cy="144" rx="11" ry={atento ? 10 : 13} fill={TINTA} />
      <path d="M112 151 Q120 157 125 148 M194 151 Q202 157 207 148" stroke="#7F969D" strokeWidth="3" fill="none" />
      <circle cx="115" cy="139" r="3.7" fill="white" /><circle cx="197" cy="139" r="3.7" fill="white" />
    </g>
    <ellipse cx="160" cy="183" rx="32" ry="23" fill={`url(#${id}-nieve)`} />
    <path d="M147 175 Q160 169 173 175 Q174 185 160 190 Q146 185 147 175Z" fill={TINTA} />
    <path d="M153 176 Q159 173 164 175" stroke="#77888E" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M160 189 V196 M144 196 Q151 204 160 196 Q169 204 176 196" fill="none" stroke={TINTA} strokeWidth="2.8" strokeLinecap="round" />
    {piezas.includes("lentes") && <g fill="#FFFFFF" fillOpacity=".09" stroke={TINTA} strokeWidth="3">
      <circle cx="119" cy="144" r="21" /><circle cx="201" cy="144" r="21" /><path d="M140 142 Q160 134 180 142 M98 140 L84 135 M222 140 L236 135" fill="none" />
      <path d="M106 136 L115 130 M188 136 L197 130" stroke="white" strokeOpacity=".7" />
    </g>}
    {piezas.includes("audifonos") && <g stroke={TINTA} strokeWidth="4">
      <path d="M83 138 C66 49 254 49 237 138" fill="none" strokeWidth="9" />
      <rect x="70" y="127" width="21" height="43" rx="10" fill="#59676D" /><rect x="229" y="127" width="21" height="43" rx="10" fill="#59676D" />
      <path d="M77 138 V155 M243 138 V155" stroke="#B5C3C5" strokeWidth="2" />
    </g>}
    {piezas.includes("lapiz") && <g transform="rotate(22 232 91)">
      <rect x="228" y="62" width="7" height="48" rx="2" fill="#B3BFC0" stroke={TINTA} strokeWidth="2" /><path d="M228 110 L231.5 119 L235 110" fill={NIEVE} stroke={TINTA} strokeWidth="2" />
    </g>}
  </g>;
}

export function CabezaHusky({ piezas = [], progreso = null, size = 56, tranquilo = false }: {
  piezas?: PiezaKey[]; progreso?: number | null; size?: number; tranquilo?: boolean;
}) {
  const id = `c${useId().replace(/:/g, "")}`;
  return <svg viewBox="52 8 216 244" width={size} height={size * 244 / 216} aria-hidden="true"
    className={`husky husky-mini ${tranquilo || progreso !== null ? "husky-quieto" : ""}`}>
    <Materiales id={id} />
    <path d="M124 216 Q160 235 196 216 L192 234 Q160 248 128 234Z" fill={`url(#${id}-bufanda)`} stroke={TINTA} strokeWidth="3" />
    <Cara id={id} piezas={piezas} atento={progreso !== null} />
    {progreso !== null && <path d={CABEZA} fill="none" stroke="var(--ambar)" strokeWidth="5" strokeLinecap="round"
      pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, Math.max(.02, progreso))} />}
  </svg>;
}

export function Husky({ piezas = [], racha = 0, nudos = 0, size = 320, tranquilo = false, atento = false, saludo = false }: {
  piezas?: PiezaKey[]; racha?: number; nudos?: number; size?: number; tranquilo?: boolean; atento?: boolean; saludo?: boolean;
}) {
  const id = `h${useId().replace(/:/g, "")}`;
  // Los nudos ganados siguen cabiendo aunque la racha actual sea corta.
  const largo = Math.min(84, Math.max(28 + Math.max(0, racha) * 2, Math.min(nudos, 5) * 11 + 18));
  return <svg viewBox="0 0 320 380" width={size} height={size * 380 / 320} role="img"
    aria-label={`Husky de pelaje gris y blanco, bufanda con ${nudos} nudos permanentes y ${piezas.length} accesorios`}
    className={`husky ${tranquilo ? "husky-quieto" : ""} ${saludo ? "husky-saludo" : ""}`}>
    <Materiales id={id} />
    <ellipse cx="161" cy="352" rx="103" ry="12" fill={TINTA} opacity=".12" />
    <g className="husky-cuerpo">
      <g className="husky-cola">
        <path d="M222 311 C285 318 306 275 277 247 C258 229 242 246 250 259 C282 251 277 283 239 278" fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" />
        <path d="M277 247 C258 229 242 246 250 259 C259 255 266 256 269 262 L280 264 L274 255 L284 258Z" fill={`url(#${id}-nieve)`} />
      </g>
      <ellipse cx="97" cy="322" rx="34" ry="25" fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" /><ellipse cx="223" cy="322" rx="34" ry="25" fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" />
      <path d="M113 208 Q160 190 207 208 Q233 263 223 330 Q160 353 97 330 Q87 263 113 208Z" fill={`url(#${id}-pelo)`} stroke={TINTA} strokeWidth="3" />
      <path d="M116 214 Q160 235 204 214 L200 247 L188 241 L192 263 L180 255 L177 292 Q160 313 143 292 L140 255 L128 263 L132 241 L120 247Z" fill={`url(#${id}-nieve)`} />
      <path d="M121 283 Q118 319 113 331 Q105 350 130 350 Q148 350 146 334 L150 289" fill={`url(#${id}-nieve)`} stroke={TINTA} strokeWidth="3" strokeLinecap="round" />
      <g className="husky-pata"><path d="M170 289 L174 334 Q172 350 190 350 Q215 350 207 331 Q202 319 199 283" fill={`url(#${id}-nieve)`} stroke={TINTA} strokeWidth="3" strokeLinecap="round" />
        <path d="M186 341 V348 M196 340 V347" stroke="#A4B1B1" strokeWidth="2" strokeLinecap="round" /></g>
      <path d="M124 340 V347 M134 341 V348" stroke="#A4B1B1" strokeWidth="2" strokeLinecap="round" />
      <path d={`M190 224 Q215 240 207 ${236 + largo} L186 ${232 + largo} Q196 255 179 237Z`} fill={`url(#${id}-bufanda)`} stroke={TINTA} strokeWidth="2.5" />
      <path d="M111 211 Q159 233 209 211 L206 232 Q160 255 114 232Z" fill={`url(#${id}-bufanda)`} stroke={TINTA} strokeWidth="3" />
      <path d="M122 227 Q157 242 192 229" stroke="#F7CF79" opacity=".65" strokeWidth="2" fill="none" />
      {Array.from({ length: Math.min(nudos, 5) }, (_, i) => <path key={i} d={`M190 ${248 + i * 11} l16 4 m-16 0 l16 -4`} stroke="#79541C" strokeWidth="3" strokeLinecap="round" />)}
      <g className="husky-cabeza"><Cara id={id} piezas={piezas} atento={atento} /></g>
    </g>
    {piezas.includes("bandera") && <g stroke={TINTA} strokeWidth="3" strokeLinejoin="round">
      <path d="M269 336 V203" /><path d="M269 204 Q286 197 304 208 L297 238 Q281 227 269 235Z" fill="#CBD5D4" /><path d="M276 213 L292 217 M276 220 L288 223" strokeWidth="2" />
    </g>}
    {piezas.includes("pesa") && <g fill="#46555B" stroke={TINTA} strokeWidth="3">
      <rect x="28" y="325" width="53" height="8" rx="4" /><rect x="24" y="315" width="12" height="28" rx="4" /><rect x="72" y="315" width="12" height="28" rx="4" />
    </g>}
    {piezas.includes("camara") && <g transform="translate(32 266)" stroke={TINTA} strokeWidth="3">
      <path d="M7 8 L13 0 H29 L35 8" fill="#99A9AD" /><rect y="8" width="43" height="30" rx="6" fill="#65767B" /><circle cx="22" cy="23" r="10" fill="#CFDAD9" /><circle cx="22" cy="23" r="5" fill={TINTA} />
    </g>}
    {piezas.includes("maletin") && <g transform="translate(243 315)" stroke={TINTA} strokeWidth="3">
      <path d="M12 3 V-3 H31 V3" fill="none" /><rect y="3" width="44" height="31" rx="5" fill="#73837E" /><path d="M1 14 Q22 21 43 14" fill="none" /><rect x="19" y="14" width="6" height="8" rx="1" fill={NIEVE} />
    </g>}
  </svg>;
}
