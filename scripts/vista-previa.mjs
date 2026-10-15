// Genera dist-vista/astia-vista.html: la app en un solo archivo, lista para publicar
// como página web de vista previa. Uso: npm run vista
import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

execSync('npx vite build -c vite.vista.config.ts', { stdio: 'inherit' })

const html = await readFile('dist-vista/index.html', 'utf8')
const cabeza = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const cuerpo = html.match(/<body>([\s\S]*?)<\/body>/)[1]

// La plataforma envuelve la página con su propio <html>/<head>/<body>, así que
// entregamos solo el contenido: título, estilos, el contenedor y el script.
const piezas = cabeza
  .replace(/<title>[\s\S]*?<\/title>/g, '')
  .replace(/<(meta|link)\b[^>]*>/g, '')
  .replace(/ crossorigin/g, '')
const ajuste = '<style>.app{padding-top:10px}</style>' // la plataforma ya añade el margen superior del iPhone

await writeFile(
  'dist-vista/astia-vista.html',
  `<title>Astia vista previa</title>\n${piezas}\n${ajuste}\n${cuerpo.replace(/ crossorigin/g, '')}\n`,
)
console.log('Listo: dist-vista/astia-vista.html')
