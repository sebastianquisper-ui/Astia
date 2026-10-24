// Saca las fotos de Alpi (niveles 1 a 4) del modelo 3D, de frente y con fondo transparente.
//
//   node herramientas/alpi/fotos.mjs <carpeta de salida>      (necesita Playwright y un Chromium; usa CHROMIUM_PATH)
//
// Deja nivel-1.png ... nivel-4.png ya recortados al contorno de Alpi y cuadrados. Después se pasan a WebP:
//   python3 -c "from PIL import Image; [Image.open(f'nivel-{n}.png').save(f'../../src/assets/alpi/foto-nivel-{n}.webp', quality=88, method=6) for n in range(1,5)]"
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const modelo = join(aqui, '..', '..', 'src', 'mascotas', 'alpi', 'modelo')
const salida = process.argv[2]
if (!salida) throw new Error('Indica la carpeta de salida')
mkdirSync(salida, { recursive: true })

const CDN = '<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>'
const html = readFileSync(join(modelo, 'alpi-3d.html'), 'utf8').replace(
  CDN,
  '<script>window.ALPI_EMBED=true</script><style>html,body{background:transparent!important}.loading{display:none!important}</style><script>' +
    readFileSync(join(modelo, 'three-0.149.min.js'), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>',
)
const pagina = join(salida, 'alpi-embebida.html')
writeFileSync(pagina, html)

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const p = await (await b.newContext({ viewport: { width: 560, height: 560 }, deviceScaleFactor: 2 })).newPage()
await p.goto('file://' + pagina)
await p.waitForFunction(() => window.Alpi, null, { timeout: 30000 })
for (const nivel of [1, 2, 3, 4]) {
  await p.evaluate((n) => { window.Alpi.setLevelInstant(n); window.Alpi.setExpression('normal'); window.Alpi.setView('frente') }, nivel)
  await p.waitForTimeout(2500) // la cámara viaja a la vista de frente
  await p.screenshot({ path: join(salida, `nivel-${nivel}-crudo.png`), omitBackground: true })
}
await b.close()
