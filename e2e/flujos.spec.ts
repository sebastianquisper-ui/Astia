import { expect, test } from '@playwright/test'

test('Hoy muestra el saludo y la navegación tiene 5 pestañas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sebastián')
  await expect(page.getByRole('navigation').getByRole('button')).toHaveCount(5)
})

test('cambiar de pestaña actualiza la pantalla y la dirección', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Tareas' }).click()
  await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible()
  await expect(page).toHaveURL(/#\/tareas$/)
  // El gesto "volver" del iPhone regresa a la pantalla anterior
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sebastián')
})

test('el horario tiene entrada propia y visible en Más', async ({ page }) => {
  await page.goto('/#/mas')
  await expect(page.getByRole('button', { name: /Horario de clases/ })).toBeVisible()
})

test('Ajustes: tema oscuro y letra grande se aplican y se recuerdan', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.getByRole('button', { name: 'Oscuro' }).click()
  await page.getByRole('button', { name: 'Muy grande' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('20.8px')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('20.8px')
})

test('Ajustes: un nombre vacío muestra un error claro', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.getByLabel('Tu nombre').fill('   ')
  await page.getByLabel('Tu nombre').blur()
  await expect(page.getByRole('status')).toContainText('no puede estar vacío')
})

test('la app es instalable: manifest con nombre, icono y modo app', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await request.get(href!)).json()
  expect(manifest.name).toBe('Astia')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
  const iconoIos = await request.get('/icons/apple-touch-icon.png')
  expect(iconoIos.ok()).toBe(true)
})

test('Hoy: al marcar una tarea Astia reacciona y avisa', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.tarea')).toHaveCount(3)
  await page.getByRole('button', { name: /Marcar hecha/ }).first().click()
  await expect(page.getByRole('status')).toContainText('Hecha')
  await expect(page.locator('.burbuja')).toContainText('Una menos')
  await expect(page.locator('.avatar')).toHaveClass(/contenta/)
})

test('Hoy: tocar a Astia la hace hablar', async ({ page }) => {
  await page.goto('/')
  const antes = await page.locator('.burbuja').innerText()
  await page.getByRole('button', { name: 'Hablar con Astia' }).click()
  await expect(page.locator('.burbuja')).not.toHaveText(antes)
})

test('Hoy: el selector de área filtra a Mi Órbita (tareas personales)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page.locator('.tarea')).toHaveCount(2)
  await expect(page.locator('.tarea').first()).toContainText(/Familia|Trámites/)
})

test('Tareas: separa vencidas y permite ver las hechas', async ({ page }) => {
  await page.goto('/#/tareas')
  await expect(page.getByRole('heading', { name: 'Vencidas' })).toBeVisible()
  await page.getByRole('button', { name: 'Hechas' }).click()
  await expect(page.locator('.tarea')).toHaveCount(1)
})

test('ocultar los datos de ejemplo deja la app vacía y clara', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.getByRole('button', { name: 'Ocultar' }).click()
  await page.goto('/#/hoy')
  await expect(page.getByText('Sin tareas todavía')).toBeVisible()
})
