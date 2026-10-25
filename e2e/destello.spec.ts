import { expect, test } from '@playwright/test'

// Mientras Alpi 3D carga no debe verse ninguna imagen ni dibujo de relleno dentro de su marco.
async function vigilar(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    ;(window as any).__relleno = 0
    const mirar = () => {
      document.querySelectorAll('.mascota.en3d .mascota-marco').forEach((m) => {
        if (m.querySelector('img, svg, .rig')) (window as any).__relleno++
      })
      document.querySelectorAll('.vestidor-vista').forEach((m) => {
        if (m.querySelector('img, svg, .rig')) (window as any).__relleno++
      })
      requestAnimationFrame(mirar)
    }
    mirar()
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('astia.sinNube', '1')
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 0 }, datosEjemplo: false, etapa: 'universidad' }))
  })
})

test('al abrir mi mascota no se ve ninguna imagen de relleno antes del 3D', async ({ page }) => {
  await page.goto('/#/mas/mascota')
  await vigilar(page)
  await page.getByRole('button', { name: /Alpi, La alpaca aventurera/ }).click()
  await page.waitForTimeout(3000)
  expect(await page.evaluate(() => (window as any).__relleno)).toBe(0)
})
