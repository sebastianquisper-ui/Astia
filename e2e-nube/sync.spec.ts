import { expect, test, type Browser, type Page } from '@playwright/test'

// Dos o tres "teléfonos" con la misma cuenta, contra los emuladores de Auth y Firestore.

async function telefono(browser: Browser, correo: string, ruta = '/#/mas/agenda'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    if (sessionStorage.getItem('iniciado')) return
    sessionStorage.setItem('iniciado', '1')
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'astia', alpi3d: false, datosEjemplo: false, descansoVista: false, etapa: 'universidad', bienvenida: true, sonidos: { activa: false, musica: { activa: false } } }))
  })
  await page.goto(ruta)
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible({ timeout: 30_000 })
  await page.evaluate((c) => (window as unknown as { __entrarConEmulador: (c: string) => Promise<unknown> }).__entrarConEmulador(c), correo)
  await expect(page.getByRole('heading', { name: 'Recordatorios y apuntes' })).toBeVisible({ timeout: 30_000 })
  return page
}

const estado = (p: Page) => p.locator('.cabecera .estado')

test('lo que anotas en un teléfono aparece en otro con la misma cuenta, y borrar también se sincroniza', async ({ browser }) => {
  const a = await telefono(browser, 'ana@prueba.com')
  await a.getByLabel('Qué quieres apuntar').fill('Hoy conseguí la beca')
  await a.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(a.locator('.fila', { hasText: 'Hoy conseguí la beca' })).toBeVisible()
  await expect(estado(a)).toContainText('Guardado en tu cuenta', { timeout: 20_000 })

  const b = await telefono(browser, 'ana@prueba.com')
  await expect(b.locator('.fila', { hasText: 'Hoy conseguí la beca' })).toBeVisible({ timeout: 20_000 })

  // un recordatorio creado en B llega a A sin recargar
  await b.getByLabel('Qué quieres recordar').fill('en 30 minutos llamar al banco')
  await b.getByRole('button', { name: 'Recordar', exact: true }).click()
  await expect(a.locator('.fila', { hasText: 'Llamar al banco' })).toBeVisible({ timeout: 20_000 })

  // borrar en A lo borra en B (la lápida no deja que resucite)
  await a.getByRole('button', { name: 'Borrar: Hoy conseguí la beca' }).click()
  await expect(b.locator('.fila', { hasText: 'Hoy conseguí la beca' })).toHaveCount(0, { timeout: 20_000 })
  await b.reload()
  await expect(b.getByRole('heading', { name: 'Recordatorios y apuntes' })).toBeVisible({ timeout: 30_000 })
  await expect(b.locator('.fila', { hasText: 'Hoy conseguí la beca' })).toHaveCount(0)
  await expect(b.locator('.fila', { hasText: 'Llamar al banco' })).toBeVisible()
})

test('otra cuenta no ve lo tuyo, aunque entre en el mismo teléfono', async ({ browser }) => {
  const a = await telefono(browser, 'carla@prueba.com')
  await a.getByLabel('Qué quieres apuntar').fill('Secreto de Carla')
  await a.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(estado(a)).toContainText('Guardado en tu cuenta', { timeout: 20_000 })

  const otra = await telefono(browser, 'dario@prueba.com')
  await expect(otra.getByText('Secreto de Carla')).toHaveCount(0)

  // mismo teléfono: se cierra la sesión de Carla y entra Darío; lo de Carla se aparta y no se sube a la cuenta de Darío
  await a.evaluate(() => (window as unknown as { __salirConEmulador?: () => Promise<void> }).__salirConEmulador?.())
  await a.reload()
  await expect(a.getByRole('button', { name: 'Continuar con Google' })).toBeVisible({ timeout: 30_000 })
  await a.evaluate(() => (window as unknown as { __entrarConEmulador: (c: string) => Promise<unknown> }).__entrarConEmulador('dario@prueba.com'))
  await expect(a.getByRole('heading', { name: 'Recordatorios y apuntes' })).toBeVisible({ timeout: 30_000 })
  await expect(a.getByText('Secreto de Carla')).toHaveCount(0)
  const aparte = await a.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('astia.datos.v2.de-')))
  expect(aparte.length).toBe(1)
})

test('"Borrar todos mis datos" también limpia la nube', async ({ browser }) => {
  const a = await telefono(browser, 'eva@prueba.com', '/#/mas/agenda')
  await a.getByLabel('Qué quieres apuntar').fill('Esto se va a borrar')
  await a.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(estado(a)).toContainText('Guardado en tu cuenta', { timeout: 20_000 })

  await a.goto('/#/mas/ajustes')
  await a.getByRole('button', { name: 'Borrar todos mis datos' }).click()
  await a.getByRole('button', { name: 'Sí, borrar todo' }).click()
  await expect(a.getByRole('button', { name: 'Continuar con Google' }).or(a.getByRole('navigation'))).toBeVisible({ timeout: 30_000 })

  const b = await telefono(browser, 'eva@prueba.com')
  await expect(b.getByText('Esto se va a borrar')).toHaveCount(0)
})
