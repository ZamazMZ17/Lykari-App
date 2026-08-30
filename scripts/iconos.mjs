// Genera los íconos de la PWA y los del APK. `npm run iconos`
//
// **Si existe `marca/logo.png`, ese archivo manda.** El dibujo de este script
// es solo el respaldo, para que la app nunca se quede sin ícono. Redibujar a
// mano un logo hecho fuera no lo iguala, y los íconos de app son PNG: no hace
// falta que sean vectores.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const GROUND = "#DCE0D9";
const LINE = "#C6CCC0";
const PINO = "#1F4D3F";
const INK = "#151A12";

const ORIGINAL = "marca/logo.png";
const hayOriginal = existsSync(ORIGINAL);

/**
 * El original suele venir con mucho margen: si se usa tal cual, la marca se ve
 * diminuta en la pantalla de inicio. Se recorta el borde uniforme y se toma su
 * color de una esquina, para rellenar después con ese mismo fondo.
 */
async function prepararOriginal() {
  const base = sharp(ORIGINAL);
  const { data } = await base
    .clone()
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fondo = { r: data[0], g: data[1], b: data[2], alpha: 1 };

  // `trim` quita el borde uniforme; el umbral tolera el ruido del degradado.
  const recortado = await base.clone().trim({ threshold: 12 }).toBuffer();
  return { fondo, recortado };
}

const original = hayOriginal ? await prepararOriginal() : null;
const FONDO_RGB = original ? original.fondo : { r: 0xdc, g: 0xe0, b: 0xd9, alpha: 1 };

/** Respaldo: el anillo del registro con la L de Lykari dentro. */
const marca = ({ radio = 150, fondo = GROUND, trazo = INK, anillo = true } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${fondo === "none" ? "" : `<rect width="512" height="512" fill="${fondo}"/>`}
  ${
    anillo
      ? `<circle cx="256" cy="256" r="${radio}" fill="none" stroke="${LINE}" stroke-width="26"/>
         <path d="M 256 ${256 - radio} A ${radio} ${radio} 0 1 1 ${256 - radio * 0.866} ${256 + radio * 0.5}"
               fill="none" stroke="${PINO}" stroke-width="26" stroke-linecap="round"/>`
      : ""
  }
  <path d="M ${256 - radio * 0.34} ${256 - radio * 0.42} L ${256 - radio * 0.34} ${256 + radio * 0.4} L ${256 + radio * 0.36} ${256 + radio * 0.4}"
        fill="none" stroke="${trazo}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * `recorte` es cuánto del lienzo ocupa la marca. El ícono adaptativo y el
 * maskable necesitan aire alrededor porque Android los recorta con la forma
 * que use cada lanzador.
 */
async function png(svg, px, { recorte = 0.86, transparente = false } = {}) {
  if (!original) return sharp(Buffer.from(svg)).resize(px, px).png();

  const dentro = Math.round(px * recorte);
  const contenido = await sharp(original.recortado)
    .resize(dentro, dentro, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const borde = Math.round((px - dentro) / 2);
  return sharp({
    create: {
      width: px,
      height: px,
      channels: 4,
      background: transparente ? { r: 0, g: 0, b: 0, alpha: 0 } : FONDO_RGB,
    },
  })
    .composite([{ input: contenido, top: borde, left: borde }])
    .png();
}

console.log(hayOriginal ? `· usando ${ORIGINAL}` : `· usando el respaldo (no hay ${ORIGINAL})`);

/* ── PWA ─────────────────────────────────────────────────────────── */
await mkdir("public", { recursive: true });
for (const [ruta, px, opciones] of [
  ["public/icono-192.png", 192, {}],
  ["public/icono-512.png", 512, {}],
  ["public/icono-180.png", 180, {}],
  // maskable: la marca vive dentro del 80 % central.
  ["public/icono-512-maskable.png", 512, { radio: 118, recorte: 0.68 }],
]) {
  await (await png(marca(opciones), px, opciones)).toFile(ruta);
  console.log("✓", ruta);
}

/* ── APK ─────────────────────────────────────────────────────────── */
const RES = "android/app/src/main/res";
if (!existsSync(RES)) {
  console.log("· sin proyecto android, me salto los íconos del APK");
  process.exit(0);
}

const DENSIDADES = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];

const circulo = (px) =>
  Buffer.from(
    `<svg width="${px}" height="${px}"><circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}" fill="#fff"/></svg>`,
  );

for (const [densidad, launcher, adaptativo] of DENSIDADES) {
  const dir = join(RES, `mipmap-${densidad}`);
  await mkdir(dir, { recursive: true });

  // Se renderiza una sola vez a buffer: llamar .composite() sobre la propia
  // instancia que ya trae uno adentro (la que arma png(), con la marca
  // compuesta sobre el fondo) no lo apila — sharp reemplaza la lista de
  // composites en vez de agregarle, así que el segundo composite() pisaba el
  // primero y el ícono redondo salía sin dibujo, solo el círculo de fondo.
  const cuadrado = await (await png(marca(), launcher)).toBuffer();
  await sharp(cuadrado).toFile(join(dir, "ic_launcher.png"));
  await sharp(cuadrado)
    .composite([{ input: circulo(launcher), blend: "dest-in" }])
    .png()
    .toFile(join(dir, "ic_launcher_round.png"));

  await (
    await png(marca({ radio: 108, fondo: "none" }), adaptativo, {
      // El lanzador recorta hasta el 66 % central: la marca va aún más dentro.
      recorte: 0.58,
      transparente: true,
    })
  ).toFile(join(dir, "ic_launcher_foreground.png"));

  // La silueta de la barra de estado se dibuja siempre: Android la pinta de un
  // solo color y de una imagen a color no sale nada legible.
  const drawable = join(RES, `drawable-${densidad}`);
  await mkdir(drawable, { recursive: true });
  await sharp(Buffer.from(marca({ fondo: "none", trazo: "#FFFFFF", anillo: false })))
    .resize(launcher, launcher)
    .png()
    .toFile(join(drawable, "ic_stat_lykari.png"));

  console.log("✓", dir);
}

// El fondo del ícono adaptativo tiene que ser el del logo, no el de la app:
// si no, la marca queda flotando sobre un color que no es el suyo.
const hex = (c) => "#" + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, "0")).join("");
const fondoAdaptativo = original ? hex(original.fondo) : GROUND;

await writeFile(
  join(RES, "values/ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${fondoAdaptativo}</color>
</resources>
`,
);
console.log("✓ fondo del ícono adaptativo:", fondoAdaptativo);
