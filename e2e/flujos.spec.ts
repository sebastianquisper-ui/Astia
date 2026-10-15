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

// ---------- fase 2: datos reales ----------

const RESPALDO = 'e2e/fixtures/respaldo-v1.json'

async function importarRespaldoV1(page: import('@playwright/test').Page) {
  await page.goto('/#/mas/ajustes')
  await page.setInputFiles('#archivo-respaldo', RESPALDO)
  await expect(page.getByRole('dialog', { name: 'Importar respaldo' })).toBeVisible()
  await page.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await expect(page.getByRole('status')).toContainText('Datos importados')
}

test('importar el respaldo de la v1 trae cursos, horario y tareas', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.setInputFiles('#archivo-respaldo', RESPALDO)
  const hoja = page.getByRole('dialog', { name: 'Importar respaldo' })
  // Resume lo que trae y avisa de lo que no pudo importar
  await expect(hoja).toContainText('3 cursos')
  await expect(hoja).toContainText('3 clases')
  await expect(hoja).toContainText('omitió')
  await page.getByRole('button', { name: 'Reemplazar mis datos' }).click()

  // Ya no son datos de ejemplo
  await expect(page.locator('.cabecera .estado')).toContainText('Solo en este teléfono')
  await page.goto('/#/cursos')
  await expect(page.getByText('Matemática Discreta')).toBeVisible()
  await page.goto('/#/mas/horario')
  await expect(page.getByText('08:00 – 10:00')).toBeVisible()
  await page.goto('/#/tareas')
  await expect(page.getByText('GUÍA 4 DE CÁLCULO II')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vencidas' })).toHaveCount(0) // el respaldo es de octubre de 2026 y hoy puede variar
})

test('lo importado sigue ahí después de cerrar y abrir la app', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.reload()
  await page.goto('/#/cursos')
  await expect(page.getByText('Física')).toBeVisible()
  await page.goto('/#/tareas')
  await expect(page.getByText('Examen parcial de Física')).toBeVisible()
})

test('un archivo que no es de Astia se rechaza con un mensaje claro', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.setInputFiles('#archivo-respaldo', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') })
  await expect(page.getByRole('status')).toContainText('no es un respaldo de Astia')
  await page.setInputFiles('#archivo-respaldo', { name: 'y.json', mimeType: 'application/json', buffer: Buffer.from('esto no es json') })
  await expect(page.getByRole('status')).toContainText('no es un respaldo de Astia')
})

test('crear una tarea con el formulario, editarla y borrarla', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: '+ Nueva tarea' }).click()

  // Sin título: error claro, la hoja sigue abierta
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Escribe qué hay que hacer')
  await expect(page.getByRole('dialog', { name: 'Nueva tarea' })).toBeVisible()

  await page.getByLabel('Qué hay que hacer').fill('Estudiar integrales')
  await page.getByLabel('Curso', { exact: true }).selectOption({ label: 'Cálculo II' })
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Tarea agregada')
  await expect(page.getByText('Estudiar integrales')).toBeVisible()

  await page.getByRole('button', { name: 'Editar: Estudiar integrales' }).click()
  await page.getByLabel('Qué hay que hacer').fill('Estudiar integrales dobles')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Estudiar integrales dobles')).toBeVisible()

  await page.getByRole('button', { name: 'Editar: Estudiar integrales dobles' }).click()
  await page.getByRole('button', { name: 'Borrar tarea' }).click() // pide confirmar
  await expect(page.getByText('Estudiar integrales dobles')).toBeVisible()
  await page.getByRole('button', { name: 'Toca otra vez para borrar' }).click()
  await expect(page.getByText('Estudiar integrales dobles')).toHaveCount(0)
})

test('una tarea personal se guarda con categoría y aparece en Mi Órbita', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: '+ Nueva tarea' }).click()
  await page.getByLabel('Qué hay que hacer').fill('Pagar el internet')
  await page.getByRole('dialog').getByRole('button', { name: 'Mi Órbita' }).click()
  await page.getByLabel('Categoría').selectOption('Trámites')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('group', { name: 'Área' }).getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page.locator('.tarea')).toHaveCount(1)
  await expect(page.locator('.tarea')).toContainText('Trámites')
})

test('agregar un curso y una clase; el horario valida las horas', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/cursos')
  await page.getByRole('button', { name: '+ Nuevo curso' }).click()
  await page.getByLabel('Nombre del curso').fill('Programación')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Curso agregado: Programación')

  await page.goto('/#/mas/horario')
  await page.getByRole('button', { name: '+ Nueva clase' }).click()
  await page.getByLabel('Curso', { exact: true }).selectOption({ label: 'Programación' })
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Elige al menos un día') // no se guardó
  await page.getByRole('group', { name: 'Días' }).getByRole('button', { name: 'mié' }).click()
  await page.getByLabel('Desde').fill('12:00')
  await page.getByLabel('Hasta').fill('11:00')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('el fin debe ser después del inicio')
  await page.getByLabel('Hasta').fill('14:00')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Clase agregada')
  await expect(page.getByText('12:00 – 14:00')).toBeVisible()
})

test('borrar un curso conserva sus tareas (sin curso) y borra sus clases', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/cursos')
  await page.getByRole('button', { name: /Cálculo II/ }).click()
  await page.getByRole('button', { name: 'Borrar curso' }).click()
  await page.getByRole('button', { name: 'Toca otra vez para borrar' }).click()
  await expect(page.getByRole('button', { name: /Cálculo II/ })).toHaveCount(0)
  await page.goto('/#/tareas')
  await expect(page.getByText('GUÍA 4 DE CÁLCULO II')).toBeVisible()
  await expect(page.locator('.tarea', { hasText: 'GUÍA 4 DE CÁLCULO II' })).toContainText('Sin curso')
})

test('Ajustes muestra en qué semana del ciclo estás', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/mas/ajustes')
  await expect(page.getByLabel('Inicio del ciclo')).toHaveValue('2026-08-24')
  await expect(page.getByText(/semana \d+ de 16|ciclo ya terminó|aún no empieza/)).toBeVisible()
})

test('exportar sin datos propios avisa en vez de descargar un archivo vacío', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.getByRole('button', { name: 'Descargar' }).click()
  await expect(page.getByRole('status')).toContainText('datos de ejemplo')
})

test('el respaldo exportado se puede importar de nuevo (v2)', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/mas/ajustes')
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar' }).click()
  const archivo = await (await descarga).path()
  await page.setInputFiles('#archivo-respaldo', archivo)
  const hoja = page.getByRole('dialog', { name: 'Importar respaldo' })
  await expect(hoja).toContainText('Respaldo de Astia v2')
  await expect(hoja).toContainText('3 cursos')
})
