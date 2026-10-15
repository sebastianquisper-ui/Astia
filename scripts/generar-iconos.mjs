// Genera los iconos de la app (PNG) a partir de una estrella dorada sobre fondo índigo.
// Uso: npm run iconos
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const FONDO = '#1F2230'
const ORO = '#DDB56E'
// Misma estrella que usa la app en la barra superior
const ESTRELLA = 'M12 2.5 14.7 8.5 21.2 9.2 16.3 13.6 17.7 20 12 16.7 6.3 20 7.7 13.6 2.8 9.2 9.3 8.5z'

// escala: qué tan grande se dibuja la estrella (la versión "maskable" va más pequeña
// porque Android recorta los bordes)
const svg = (tam, escala) => {
  const lado = 24 * escala
  const off = (24 - lado) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 24 24">
  <rect width="24" height="24" fill="${FONDO}"/>
  <g transform="translate(${off} ${off}) scale(${escala})"><path d="${ESTRELLA}" fill="${ORO}"/></g>
</svg>`
}

const salida = 'public/icons'
await mkdir(salida, { recursive: true })

const png = async (nombre, tam, escala) =>
  sharp(Buffer.from(svg(tam, escala))).png().toFile(`${salida}/${nombre}`)

// iPhone pide un cuadrado opaco de 180x180 (iOS le pone las esquinas redondeadas)
await png('apple-touch-icon.png', 180, 0.7)
await png('icon-192.png', 192, 0.7)
await png('icon-512.png', 512, 0.7)
await png('icon-maskable-512.png', 512, 0.5)
await writeFile(`${salida}/favicon.svg`, svg(64, 0.7))
console.log('Iconos generados en', salida)
