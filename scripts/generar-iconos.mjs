// Genera los iconos de la app (PNG) a partir del logo: herramientas/icono/astia-icono.png (la "A" con su órbita).
// El logo trae esquinas redondeadas y un marco; para los iconos se recorta el centro a pantalla completa
// (el iPhone y Android ponen sus propias esquinas). Uso: npm run iconos
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const FUENTE = 'herramientas/icono/astia-icono.png'
const salida = 'public/icons'
await mkdir(salida, { recursive: true })

// Recorte cuadrado centrado en el cuadrado redondeado del logo (1254 px), sin esquinas ni marco
const { width } = await sharp(FUENTE).metadata()
const f = width / 1254
const LADO = Math.round(920 * f)
const recorte = { left: Math.round(166 * f), top: Math.round(163 * f), width: LADO, height: LADO }
const completo = () => sharp(FUENTE).extract(recorte)

const png = (nombre, tam) => completo().resize(tam, tam).png().toFile(`${salida}/${nombre}`)
await png('apple-touch-icon.png', 180) // iPhone pide un cuadrado opaco (iOS le pone las esquinas)
await png('icon-192.png', 192)
await png('icon-512.png', 512)
await png('favicon-64.png', 64)

// "Maskable" (Android recorta los bordes): el logo se achica al 78 % sobre un fondo del mismo azul,
// con el borde difuminado para que no se note dónde empieza.
const interior = Math.round(512 * 0.78)
const margen = Math.round((512 - interior) / 2)
// degradado del azul de arriba al de abajo del logo (colores medidos en sus bordes)
const fondo = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(14,24,69)"/><stop offset="1" stop-color="rgb(12,18,47)"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/></svg>',
)
const difuminado = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${interior}" height="${interior}"><defs><filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs><rect x="22" y="22" width="${interior - 44}" height="${interior - 44}" fill="#fff" filter="url(#b)"/></svg>`,
)
const frente = await completo().resize(interior, interior).composite([{ input: difuminado, blend: 'dest-in' }]).png().toBuffer()
await sharp(fondo).composite([{ input: frente, left: margen, top: margen }]).png().toFile(`${salida}/icon-maskable-512.png`)
console.log('Iconos generados en', salida)
