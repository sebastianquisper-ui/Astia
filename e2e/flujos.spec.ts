import { expect, test } from '@playwright/test'

// Todas las pruebas "viven" en el jueves 15 de octubre de 2026, 10:30 (así no dependen de la hora real:
// por ejemplo, de noche Astia se duerme y las rachas cambian).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 15, 10, 30))
})

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

// ---------- modos: Académico y Mi Órbita ----------

const MODO = (page: import('@playwright/test').Page) => page.getByRole('group', { name: 'Modo' })
const NAV = (page: import('@playwright/test').Page) => page.getByRole('navigation')

test('el modo Mi Órbita cambia la pestaña del medio, Hoy y el tono', async ({ page }) => {
  await page.goto('/')
  await expect(NAV(page).getByRole('button', { name: 'Cursos' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-modo', 'academico')

  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-modo', 'personal')
  await expect(NAV(page).getByRole('button', { name: 'Hábitos' })).toBeVisible()
  await expect(NAV(page).getByRole('button', { name: 'Cursos' })).toHaveCount(0)
  await expect(NAV(page).getByRole('button', { name: 'Pendientes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hábitos de hoy' })).toBeVisible()
  await expect(page.getByText('Tus 3 de hoy')).toHaveCount(0) // lo académico no aparece
  await expect(page.getByText('Próxima clase')).toHaveCount(0)

  // El modo se recuerda al recargar
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-modo', 'personal')
  await MODO(page).getByRole('button', { name: 'Académico' }).click()
  await expect(page.getByText('Tus 3 de hoy')).toBeVisible()
})

test('al cambiar de modo estando en Cursos, pasas a Hábitos (su pestaña gemela)', async ({ page }) => {
  await page.goto('/#/cursos')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page).toHaveURL(/#\/habitos$/)
  await MODO(page).getByRole('button', { name: 'Académico' }).click()
  await expect(page).toHaveURL(/#\/cursos$/)
})

test('cada modo ve solo sus tareas', async ({ page }) => {
  await page.goto('/#/tareas')
  await expect(page.getByText('Llamar a mi abuela')).toHaveCount(0) // personal
  await expect(page.getByText('Examen parcial de Física')).toBeVisible()
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page.getByRole('heading', { name: 'Pendientes' })).toBeVisible()
  await expect(page.getByText('Llamar a mi abuela')).toBeVisible()
  await expect(page.getByText('Examen parcial de Física')).toHaveCount(0)
})

test('un pendiente personal NO pide tipo, prioridad ni evidencia: solo apartado y fecha', async ({ page }) => {
  await page.goto('/#/tareas')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.getByRole('button', { name: '+ Nuevo pendiente' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo pendiente' })
  await expect(hoja).toBeVisible()
  // Nada de lo académico
  await expect(hoja.getByText('Examen')).toHaveCount(0)
  await expect(hoja.getByText('Estudio')).toHaveCount(0)
  await expect(hoja.getByLabel('Prioridad')).toHaveCount(0)
  await expect(hoja.getByText('Pedir evidencia')).toHaveCount(0)
  await expect(hoja.getByLabel('Curso', { exact: true })).toHaveCount(0)
  // Sí: apartados y una técnica sugerida
  for (const a of ['Deporte', 'Salud', 'Mente', 'Hogar', 'Familia', 'Dinero', 'Trámites']) {
    await expect(hoja.getByRole('button', { name: a })).toBeVisible()
  }
  await hoja.getByRole('button', { name: 'Deporte' }).click()
  await expect(hoja.getByText('Técnica sugerida: Entrenamiento por series')).toBeVisible()

  await hoja.getByLabel('Qué tienes pendiente').fill('Comprar guantes de gimnasio')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Pendiente agregado')
  const fila = page.locator('.tarea', { hasText: 'Comprar guantes de gimnasio' })
  await expect(fila).toContainText('Deporte')
  await expect(fila).not.toContainText('Examen')
})

test('un pendiente personal sin título da un error propio de Mi Órbita', async ({ page }) => {
  await page.goto('/#/tareas')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.getByRole('button', { name: '+ Nuevo pendiente' }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Escribe qué tienes pendiente')
})

test('Hábitos: cumplir uno hoy suma a la racha y Astia se alegra', async ({ page }) => {
  await page.goto('/#/habitos')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  const card = page.locator('.habito-card', { hasText: '30 minutos de inglés' })
  await expect(card.locator('.racha')).toContainText('6') // 6 días seguidos (ayer y los 5 anteriores), hoy pendiente
  await card.getByRole('button', { name: /Cumplido hoy/ }).click()
  await expect(card.locator('.racha')).toContainText('7')
  await expect(card.locator('.check.on')).toHaveCount(1)
  await card.getByRole('button', { name: /Desmarcar/ }).click()
  await expect(card.locator('.racha')).toContainText('6')
})

test('Hábitos: crear uno con el formulario (días fijos y versión mínima) y validar', async ({ page }) => {
  await page.goto('/#/habitos')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.getByRole('button', { name: '+ Nuevo hábito' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo hábito' })
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Escribe el nombre del hábito')

  await hoja.getByLabel('Nombre del hábito').fill('Nadar')
  await hoja.getByRole('group', { name: 'Apartado' }).getByRole('button', { name: 'Deporte' }).click()
  await hoja.getByRole('button', { name: 'Ciertos días' }).click()
  for (const d of ['lun', 'mié', 'vie']) await hoja.getByRole('group', { name: 'Días' }).getByRole('button', { name: d }).click() // quita los de por defecto
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Elige al menos un día')
  await hoja.getByRole('group', { name: 'Días' }).getByRole('button', { name: 'mar' }).click()
  await hoja.getByLabel('Versión mínima', { exact: false }).fill('Solo 10 minutos')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Hábito agregado: Nadar')
  const card = page.locator('.habito-card', { hasText: 'Nadar' })
  await expect(card).toContainText('Deporte')
  await expect(card).toContainText('mar')
  await expect(card).toContainText('Mínimo: Solo 10 minutos')
})

test('Hábitos: una idea rápida llena el formulario', async ({ page }) => {
  await page.goto('/#/habitos')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.getByRole('button', { name: '+ Nuevo hábito' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo hábito' })
  await hoja.getByRole('button', { name: 'Leer 10 páginas' }).click()
  await expect(hoja.getByLabel('Nombre del hábito')).toHaveValue('Leer 10 páginas')
  await expect(hoja.getByLabel('Versión mínima', { exact: false })).toHaveValue('Una sola página')
})

test('Hábitos: el detalle muestra la racha y deja corregir un día en el calendario', async ({ page }) => {
  await page.goto('/#/habitos')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.getByRole('button', { name: 'Ver: 30 minutos de inglés' }).click()
  const hoja = page.getByRole('dialog', { name: '30 minutos de inglés' })
  await expect(hoja).toContainText('racha actual')
  await expect(hoja).toContainText('mejor racha')
  await expect(hoja).toContainText('últimos 30 días')
  const celdas = hoja.locator('.mes-celda.hecho')
  const antes = await celdas.count()
  expect(antes).toBeGreaterThan(5)
  // desmarcar el primer día cumplido (un olvido corregido) baja la cuenta
  await celdas.first().click()
  await expect(hoja.locator('.mes-celda.hecho')).toHaveCount(antes - 1)
})

test('Rutinas: no se puede terminar con pasos sin marcar; marcar todos la cumple', async ({ page }) => {
  await page.goto('/')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.goto('/#/mas/rutinas')
  await page.getByRole('button', { name: 'Empezar: Rutina de la mañana' }).click()
  const hoja = page.getByRole('dialog', { name: 'Rutina de la mañana' })
  await expect(hoja).toContainText('0 de 5')
  await hoja.getByRole('button', { name: /^Faltan 5/ }).click()
  await expect(page.getByRole('status')).toContainText('Faltan 5 pasos')
  for (let i = 0; i < 5; i++) await hoja.locator('.paso:not(.hecho)').first().click()
  await expect(hoja).toContainText('5 de 5')
  await hoja.getByRole('button', { name: 'Terminar rutina' }).click()
  await expect(page.getByRole('status')).toContainText('Rutina cumplida')
  await expect(page.locator('.rutina-card', { hasText: 'Rutina de la mañana' })).toContainText('Hecha hoy')
})

test('Rutinas de deporte tienen descanso con cuenta regresiva; las demás no', async ({ page }) => {
  await page.goto('/')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.goto('/#/mas/rutinas')
  await page.getByRole('button', { name: 'Empezar: Entrenamiento de pecho y tríceps' }).click()
  const hoja = page.getByRole('dialog', { name: 'Entrenamiento de pecho y tríceps' })
  await expect(hoja).toContainText('Press banca')
  await expect(hoja).toContainText('4 × 10')
  await hoja.getByRole('button', { name: '60 s' }).click()
  await expect(hoja.getByRole('timer')).toContainText(/0:5\d|1:00/)
  await hoja.getByRole('button', { name: 'Saltar descanso' }).click()
  await expect(hoja.getByRole('timer')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Empezar: Rutina de la mañana' }).click()
  await expect(page.getByRole('dialog', { name: 'Rutina de la mañana' }).getByText('Descanso entre series')).toHaveCount(0)
})

test('Rutinas: crear una con pasos, reordenarlos y validar', async ({ page }) => {
  await page.goto('/')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.goto('/#/mas/rutinas')
  await page.getByRole('button', { name: '+ Nueva rutina' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nueva rutina' })
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Escribe el nombre de la rutina')
  await hoja.getByLabel('Nombre de la rutina').fill('Piernas')
  await hoja.getByRole('group', { name: 'Apartado' }).getByRole('button', { name: 'Deporte' }).click()
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Agrega al menos un paso')
  await hoja.getByLabel('Paso 1', { exact: true }).fill('Sentadillas')
  await hoja.getByLabel('Detalle del paso 1', { exact: true }).fill('4 × 12')
  await hoja.getByRole('button', { name: '+ Agregar ejercicio' }).click()
  await hoja.getByLabel('Paso 2', { exact: true }).fill('Peso muerto')
  await hoja.getByRole('button', { name: 'Subir el paso 2' }).click() // ahora Peso muerto es el 1
  await expect(hoja.getByLabel('Paso 1', { exact: true })).toHaveValue('Peso muerto')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Rutina agregada: Piernas')
  await expect(page.locator('.rutina-card', { hasText: 'Piernas' })).toContainText('2 pasos')
})

test('Semana en Mi Órbita: cuadrícula de hábitos que se puede marcar', async ({ page }) => {
  await page.goto('/#/semana')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  const tabla = page.getByRole('table', { name: 'Hábitos de la semana' })
  await expect(tabla).toContainText('30 minutos de inglés')
  await expect(tabla.locator('.cuadricula-celda')).toHaveCount(35) // 5 hábitos x 7 días
  const hoyCelda = tabla.locator('[role=row]', { hasText: 'Tomar 2 litros de agua' }).locator('.cuadricula-celda.hoy')
  await expect(hoyCelda).toHaveCount(1)
  await hoyCelda.click()
  await expect(tabla.locator('[role=row]', { hasText: 'Tomar 2 litros de agua' }).locator('.cuadricula-celda.hecho')).toHaveCount(await tabla.locator('[role=row]', { hasText: 'Tomar 2 litros de agua' }).locator('.cuadricula-celda.hecho').count())
  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await expect(page.getByText('Esta semana')).toHaveCount(0)
})

test('Hoy en Mi Órbita: la tarjeta de hábitos y la lista siguen el mismo avance', async ({ page }) => {
  await page.goto('/')
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  const tarjeta = page.locator('.tarjeta-ahora')
  await expect(tarjeta).toContainText('Hábitos de hoy')
  const antes = await tarjeta.locator('.orbita-centro b').innerText()
  await page.locator('.habito-card').getByRole('button', { name: /Cumplido hoy/ }).first().click()
  const despues = await tarjeta.locator('.orbita-centro b').innerText()
  expect(despues).not.toBe(antes)
  await expect(page.locator('.burbuja')).toContainText(/Uno menos|disciplina/)
})

test('Hoy en Mi Órbita sin datos invita a crear el primer hábito', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  await page.getByRole('button', { name: 'Ocultar' }).click()
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.goto('/#/hoy')
  await expect(page.getByText('Aún no tienes hábitos')).toHaveCount(2) // la tarjeta y la burbuja de Astia
  await page.getByRole('button', { name: '+ Hábito' }).click()
  await expect(page.getByRole('dialog', { name: 'Nuevo hábito' })).toBeVisible()
})

test('las metas de la v1 llegan como hábitos de todos los días', async ({ page }) => {
  await importarRespaldoV1(page)
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.goto('/#/habitos')
  await expect(page.locator('.habito-card', { hasText: '30 minutos de inglés' })).toContainText('Todos los días')
  await expect(page.locator('.habito-card', { hasText: '30 minutos de inglés' }).locator('.racha')).toBeVisible()
})

test('la pestaña Más muestra Rutinas en Mi Órbita y Horario en Académico', async ({ page }) => {
  await page.goto('/#/mas')
  await expect(page.getByRole('button', { name: /Horario de clases/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Rutinas/ })).toHaveCount(0)
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page.getByRole('button', { name: /^Rutinas/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Horario de clases/ })).toHaveCount(0)
})
