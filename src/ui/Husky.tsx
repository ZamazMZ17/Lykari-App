import { useId } from "react";
import type { PiezaKey } from "../db/mascota";
import { largoBufanda } from "../lib/racha";

/**
 * Husky en estilo pegatina: contorno negro grueso, colores planos y sin
 * gradientes. La cabeza no es un círculo — cráneo ancho arriba que se estrecha
 * hacia el hocico, con la máscara negra bajando en pico entre los ojos y una
 * franja clara subiendo por el centro.
 *
 * Como el husky es frío, **la bufanda es lo único con color**: ámbar.
 */

// La mascota es una ilustración de un husky blanco y negro: sus colores son
// intrínsecos y NO siguen el tema. Antes el negro era var(--ink), que en modo
// oscuro se vuelve casi blanco y dejaba el rostro entero blanco, sin ojos.
const NEGRO = "#151A12";
const OSCURO = "#2E3233";
const CREMA = "#EDEAE0";
const BLANCO = "#FBFBF9";
const LENGUA = "#DE9B9B";

const TRAZO = 7;

/**
 * Las rutas de la cabeza viven aparte porque se dibujan en dos sitios: la
 * mascota entera y la burbuja flotante, que es solo la cabeza.
 */
const CRANEO =
  "M160 56 C210 56 254 88 258 146 C262 186 252 216 232 236 C212 254 188 262 160 262 C132 262 108 254 88 236 C68 216 58 186 62 146 C66 88 110 56 160 56 Z";
const OREJA_IZQ = "M94 16 C112 38 142 76 154 102 C128 118 92 126 68 122 C60 86 74 42 94 16 Z";
const OREJA_IZQ_DENTRO = "M97 48 C110 66 130 88 140 102 C122 112 96 116 82 112 C78 88 86 62 97 48 Z";
const OREJA_DER = "M226 16 C208 38 178 76 166 102 C192 118 228 126 252 122 C260 86 246 42 226 16 Z";
const OREJA_DER_DENTRO =
  "M223 48 C210 66 190 88 180 102 C198 112 224 116 238 112 C242 88 234 62 223 48 Z";
const MASCARA =
  "M56 150 C58 88 108 50 160 50 C212 50 262 88 264 150 C266 176 262 198 254 216 C250 164 234 130 208 114 C198 134 184 150 170 158 L160 166 L150 158 C136 150 122 134 112 114 C86 130 70 164 66 216 C58 198 54 176 56 150 Z";
const FRANJA = "M160 62 L167 148 L160 156 L153 148 Z";
const HOCICO =
  "M160 176 C172 176 180 184 180 192 C180 202 171 210 160 210 C149 210 140 202 140 192 C140 184 148 176 160 176 Z";
const LENGUA_RUTA = "M146 226 C146 244 152 252 160 252 C168 252 174 244 174 226 Z";

/** Orejas, cráneo, máscara y cara. Se comparte entre la mascota y la burbuja. */
function Cara({ clip, piezas }: { clip: string; piezas: PiezaKey[] }) {
  const tiene = (k: PiezaKey) => piezas.includes(k);
  return (
    <>
      <g className="f-ear">
        <path d={OREJA_IZQ} fill={OSCURO} stroke={NEGRO} strokeWidth={TRAZO} strokeLinejoin="round" />
        <path d={OREJA_IZQ_DENTRO} fill={CREMA} />
      </g>
      <g>
        <path d={OREJA_DER} fill={OSCURO} stroke={NEGRO} strokeWidth={TRAZO} strokeLinejoin="round" />
        <path d={OREJA_DER_DENTRO} fill={CREMA} />
      </g>

      <path d={CRANEO} fill={BLANCO} stroke={NEGRO} strokeWidth={TRAZO} />

      <g clipPath={`url(#${clip})`}>
        <path d={MASCARA} fill={OSCURO} />
        <path d={FRANJA} fill={CREMA} />
      </g>

      <g>
        <circle cx="126" cy="152" r="15" fill={NEGRO} />
        <circle cx="194" cy="152" r="15" fill={NEGRO} />
        <circle cx="121" cy="146" r="5" fill="#fff" opacity=".95" />
        <circle cx="189" cy="146" r="5" fill="#fff" opacity=".95" />
        {/* El párpado es un círculo del tamaño exacto del ojo. Antes era un
            rectángulo más ancho y más bajo: sobresalía por arriba mordiendo la
            máscara oscura y dejaba media luna negra abajo, así que al animarse
            se leía como una ceja subiendo y bajando en vez de un parpadeo. */}
        <g className="f-blink">
          <circle cx="126" cy="152" r="15.5" fill={BLANCO} />
          <circle cx="194" cy="152" r="15.5" fill={BLANCO} />
        </g>
      </g>

      <path d={HOCICO} fill={NEGRO} />
      <path d="M160 210 v10" stroke={NEGRO} strokeWidth="5" strokeLinecap="round" />
      <path d="M160 220 C152 234 138 232 133 222" fill="none" stroke={NEGRO} strokeWidth="5" strokeLinecap="round" />
      <path d="M160 220 C168 234 182 232 187 222" fill="none" stroke={NEGRO} strokeWidth="5" strokeLinecap="round" />
      <path d={LENGUA_RUTA} fill={LENGUA} stroke={NEGRO} strokeWidth="4" strokeLinejoin="round" />

      {tiene("lentes") && (
        <g stroke={NEGRO} strokeWidth="5" fill="rgba(255,255,255,.2)">
          <circle cx="126" cy="152" r="24" />
          <circle cx="194" cy="152" r="24" />
          <path d="M150 150 q10 -6 20 0" fill="none" />
          <path d="M102 148 l-18 -8" fill="none" />
          <path d="M218 148 l18 -8" fill="none" />
        </g>
      )}

      {tiene("lapiz") && (
        <g transform="rotate(-24 92 104)">
          <rect x="80" y="86" width="11" height="52" rx="3" fill="#C9A227" stroke={NEGRO} strokeWidth="4" />
          <path d="M80 138 l5.5 12 l5.5 -12 z" fill="#F0DFA8" stroke={NEGRO} strokeWidth="3" />
        </g>
      )}

      {tiene("bandera") && (
        <g transform="translate(246 24)">
          <rect x="0" y="0" width="5" height="52" rx="2.5" fill={NEGRO} />
          <path d="M5 4 L40 14 L5 26 Z" fill="var(--video)" stroke={NEGRO} strokeWidth="4" strokeLinejoin="round" />
        </g>
      )}

      {tiene("audifonos") && (
        <g>
          <path d="M76 150 C76 84 244 84 244 150" fill="none" stroke={NEGRO} strokeWidth="9" strokeLinecap="round" />
          <rect x="60" y="140" width="30" height="44" rx="14" fill="var(--musica)" stroke={NEGRO} strokeWidth={TRAZO} />
          <rect x="230" y="140" width="30" height="44" rx="14" fill="var(--musica)" stroke={NEGRO} strokeWidth={TRAZO} />
        </g>
      )}
    </>
  );
}

/**
 * Solo la cabeza, recortada a su propia silueta. Es lo que flota en la app: la
 * burbuja **es** la cabeza, no una cabeza dentro de un círculo.
 *
 * El progreso de la sesión se dibuja recorriendo el contorno del cráneo con
 * `pathLength`, así el ámbar sigue la forma en vez de un anillo que no pega.
 */
export function CabezaHusky({
  piezas = [],
  progreso = null,
  size = 56,
}: {
  piezas?: PiezaKey[];
  progreso?: number | null;
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="50 6 220 268"
      width={size}
      height={(size * 268) / 220}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <clipPath id={`c${id}`}>
          <path d={CRANEO} />
        </clipPath>
        <filter id={`s${id}`} x="-25%" y="-25%" width="150%" height="150%">
          {/* flood-color/flood-opacity son propiedades CSS reales (no solo
              atributos SVG): siguen el mismo --sombra-color/-alfa que el
              resto de la elevación, en vez de un color fijo que ignoraba el
              tema oscuro. */}
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="5"
            style={{ floodColor: "var(--sombra-color)", floodOpacity: "var(--sombra-alfa)" }}
          />
        </filter>
      </defs>
      <g filter={`url(#s${id})`}>
        <Cara clip={`c${id}`} piezas={piezas} />
      </g>
      {progreso !== null && (
        <path
          d={CRANEO}
          fill="none"
          stroke="var(--ambar)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - Math.min(1, Math.max(0, progreso))}
        />
      )}
    </svg>
  );
}

export function Husky({
  piezas = [],
  racha = 0,
  nudos = 0,
  size = 320,
}: {
  piezas?: PiezaKey[];
  racha?: number;
  nudos?: number;
  size?: number;
}) {
  const tiene = (k: PiezaKey) => piezas.includes(k);
  const largo = largoBufanda(racha);
  // Ids únicos: en la app hay dos huskys a la vez (la burbuja y la hoja) y con
  // ids fijos el segundo se quedaría con el recorte del primero.
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 320 380"
      width={size}
      height={(size * 380) / 320}
      role="img"
      aria-label={`Husky con ${racha} días de racha`}
    >
      <defs>
        <clipPath id={`hc${id}`}>
          <path d={CRANEO} />
        </clipPath>
        <clipPath id={`hb${id}`}>
          <path d="M160 206 C216 206 252 258 260 320 C264 348 252 364 232 364 L88 364 C68 364 56 348 60 320 C68 258 104 206 160 206 Z" />
        </clipPath>
      </defs>

      <ellipse cx="160" cy="372" rx="92" ry="10" fill={NEGRO} opacity=".12" />

      <g className="f-float">
        {/* cola tupida, asomando por detrás */}
        <g className="f-tail">
          <path
            d="M236 318 C288 314 306 254 282 210"
            fill="none"
            stroke={NEGRO}
            strokeWidth={38 + TRAZO}
            strokeLinecap="round"
          />
          <path
            d="M236 318 C288 314 306 254 282 210"
            fill="none"
            stroke={OSCURO}
            strokeWidth="38"
            strokeLinecap="round"
          />
          <path
            d="M292 244 C298 228 288 214 282 210"
            fill="none"
            stroke={CREMA}
            strokeWidth="30"
            strokeLinecap="round"
          />
        </g>

        <g className="f-breath">
          {/* patas traseras a los lados */}
          <ellipse cx="70" cy="336" rx="36" ry="26" fill={CREMA} stroke={NEGRO} strokeWidth={TRAZO} />
          <ellipse cx="250" cy="336" rx="36" ry="26" fill={CREMA} stroke={NEGRO} strokeWidth={TRAZO} />

          {/* cuerpo */}
          <path
            d="M160 206 C216 206 252 258 260 320 C264 348 252 364 232 364 L88 364 C68 364 56 348 60 320 C68 258 104 206 160 206 Z"
            fill={OSCURO}
            stroke={NEGRO}
            strokeWidth={TRAZO}
          />
          {/* pecho claro con el borde del pelaje en picos */}
          <g clipPath={`url(#hb${id})`}>
            <path
              d="M160 208 C204 214 226 250 232 292 L242 312 L226 306 L230 330 L212 318 L214 344 L196 328 L192 356 L176 336 L160 366 L144 336 L128 356 L124 328 L106 344 L108 318 L90 330 L94 306 L78 312 L88 292 C94 250 116 214 160 208 Z"
              fill={BLANCO}
            />
          </g>

          {/* patas delanteras */}
          <g fill={CREMA} stroke={NEGRO} strokeWidth={TRAZO}>
            <rect x="116" y="296" width="42" height="68" rx="20" />
            <rect x="162" y="296" width="42" height="68" rx="20" />
          </g>
          <g stroke="#B9BDB8" strokeWidth="3.5" strokeLinecap="round">
            <path d="M128 350 v10" />
            <path d="M137 350 v10" />
            <path d="M146 350 v10" />
            <path d="M174 350 v10" />
            <path d="M183 350 v10" />
            <path d="M192 350 v10" />
          </g>
        </g>

        {/* cabeza */}
        <g className="f-head">
          <Cara clip={`hc${id}`} piezas={piezas} />
        </g>

        {/* bufanda: lo único con color, y lo que mide la racha */}
        <g className="f-scarf">
          {/* Collar ceñido al cuello, bajo la barbilla: si se ensancha tapa el
              pecho y el husky se convierte en una mancha oscura. */}
          <path
            d="M118 252 C136 274 184 274 202 252 C210 266 209 280 202 289 C180 305 140 305 118 289 C111 280 110 266 118 252 Z"
            fill="var(--ambar)"
            stroke={NEGRO}
            strokeWidth={TRAZO}
            strokeLinejoin="round"
          />
          <path
            d={`M196 292 c11 7 15 ${largo * 0.4} 10 ${largo}`}
            fill="none"
            stroke={NEGRO}
            strokeWidth={22 + TRAZO}
            strokeLinecap="round"
          />
          <path
            d={`M196 292 c11 7 15 ${largo * 0.4} 10 ${largo}`}
            fill="none"
            stroke="var(--ambar)"
            strokeWidth="22"
            strokeLinecap="round"
          />
          {/* un nudo por cada siete días ganados: no se caen nunca */}
          {Array.from({ length: Math.min(nudos, 6) }).map((_, i) => (
            <circle
              key={i}
              cx={199 + i * 1.5}
              cy={298 + (i + 1) * (largo / (Math.min(nudos, 6) + 1))}
              r="8"
              fill="#A8690A"
              stroke={NEGRO}
              strokeWidth="4"
            />
          ))}
        </g>

        {tiene("pesa") && (
          <g transform="translate(-8 8)">
            <rect x="52" y="322" width="52" height="9" rx="4.5" fill={NEGRO} />
            <rect x="42" y="310" width="16" height="33" rx="5" fill={NEGRO} />
            <rect x="98" y="310" width="16" height="33" rx="5" fill={NEGRO} />
          </g>
        )}

        {tiene("maletin") && (
          <g transform="translate(228 300)">
            <rect x="0" y="8" width="50" height="36" rx="6" fill="var(--negocio)" stroke={NEGRO} strokeWidth={TRAZO} />
            <path d="M16 8 v-6 a4 4 0 0 1 4 -4 h10 a4 4 0 0 1 4 4 v6" fill="none" stroke={NEGRO} strokeWidth="5" />
          </g>
        )}

        {tiene("camara") && (
          <g transform="translate(30 286)">
            <rect x="0" y="8" width="46" height="32" rx="7" fill="var(--video)" stroke={NEGRO} strokeWidth={TRAZO} />
            <path d="M46 18 l16 -9 v26 l-16 -9 z" fill="var(--video)" stroke={NEGRO} strokeWidth={TRAZO} strokeLinejoin="round" />
            <circle cx="18" cy="24" r="8" fill={CREMA} />
          </g>
        )}
      </g>
    </svg>
  );
}
