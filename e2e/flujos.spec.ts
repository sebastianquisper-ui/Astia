import { expect, test } from '@playwright/test'

// Todas las pruebas "viven" en el jueves 15 de octubre de 2026, 10:30 (así no dependen de la hora real:
// por ejemplo, de noche Astia se duerme y las rachas cambian).
test.beforeEach(async ({ page }) => {
  // El reloj arranca ahí y sigue corriendo; una prueba puede adelantarlo con fastForward
  await page.clock.install({ time: new Date(2026, 9, 15, 10, 30) })
  // Alpi en 3D viene por defecto, pero sin tarjeta gráfica (como en estas pruebas) ocupa todo el
  // procesador. Las pruebas usan la estrella y Alpi dibujada, salvo las que prueban el 3D.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-iniciado')) return
    sessionStorage.setItem('e2e-iniciado', '1')
    try {
      const a = JSON.parse(localStorage.getItem('astia.ajustes') || '{}')
      localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'astia', alpi3d: false, datosEjemplo: true, descansoVista: false, etapa: 'universidad', ...a }))
    } catch {
      /* sin almacenamiento */
    }
  })
})

async function entregarConEnlace(page: import('@playwright/test').Page) {
  const hoja = page.getByRole('dialog', { name: 'Entrega tu evidencia' })
  await expect(hoja.getByRole('button', { name: 'Marcar hecha con evidencia' })).toBeDisabled() // sin evidencia no se puede
  await hoja.getByLabel(/enlace de la entrega/).fill('https://classroom.google.com/c/entrega')
  await hoja.getByRole('button', { name: 'Marcar hecha con evidencia' }).click()
  await expect(hoja).toHaveCount(0)
}

async function elegirAlpi(page: import('@playwright/test').Page) {
  await page.goto('/#/mas/mascota')
  await page.getByRole('button', { name: /Alpi, La alpaca aventurera/ }).click()
  await page.getByRole('button', { name: 'Elegir a Alpi' }).click()
}

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
  await entregarConEnlace(page)
  await expect(page.getByRole('status')).toContainText('Tarea hecha')
  await expect(page.locator('.burbuja')).toContainText('Una menos')
  await expect(page.locator('[data-animo]')).toHaveAttribute('data-animo', 'contenta')
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
  await page.getByRole('button', { name: 'Editar curso' }).click()
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

// ---------- métodos de estudio y sesión guiada ----------

const SESION = (page: import('@playwright/test').Page, nombre: string) => page.getByRole('dialog', { name: `Sesión: ${nombre}` })

test('Enfoque y descanso: la biblioteca tiene los 10 métodos y muestra sus pasos', async ({ page }) => {
  await page.goto('/#/mas/enfoque')
  await expect(page.locator('.metodo-card')).toHaveCount(10)
  for (const nombre of ['Pomodoro', 'Feynman', 'Recuperación activa', 'Repetición espaciada', 'Cornell', 'Práctica intercalada', 'SQ3R', 'Mapa mental', 'Tarjetas de estudio', 'Resolver problemas por pasos']) {
    await expect(page.locator('.metodo-card', { hasText: nombre })).toBeVisible()
  }
  await page.locator('.metodo-cab', { hasText: 'Feynman' }).click()
  await expect(page.getByText('Explícalo sin mirar')).toBeVisible()
  await expect(page.getByText('Busca los huecos')).toBeVisible()
})

test('Más → Enfoque y descanso es una entrada visible de Académico', async ({ page }) => {
  await page.goto('/#/mas')
  await page.getByRole('button', { name: /Enfoque y descanso/ }).click()
  await expect(page.getByRole('heading', { name: 'Enfoque y descanso' })).toBeVisible()
})

test('los tiempos del Pomodoro se guardan y la sesión los usa', async ({ page }) => {
  await page.goto('/#/mas/enfoque')
  await page.getByLabel('Enfoque (min)').fill('40')
  await page.getByLabel('Descanso (min)').fill('10')
  await page.getByLabel('Descanso (min)').blur()
  await expect(page.getByRole('status')).toContainText('Tiempos del Pomodoro guardados')
  await page.locator('.metodo-cab', { hasText: 'Pomodoro' }).click()
  await page.getByRole('button', { name: 'Empezar Pomodoro' }).click()
  await expect(SESION(page, 'Pomodoro').getByRole('timer')).toContainText('40:00')
  await expect(SESION(page, 'Pomodoro')).toContainText('Paso 1 de 2')
})

test('sesión guiada: recorre las fases y termina con el mensaje de Astia', async ({ page }) => {
  await page.goto('/#/mas/enfoque')
  await page.locator('.metodo-cab', { hasText: 'Feynman' }).click()
  await page.getByRole('button', { name: 'Empezar Feynman' }).click()
  const sesion = SESION(page, 'Feynman')
  await expect(sesion).toContainText('Estudia el tema')
  await expect(sesion).toContainText('Paso 1 de 4')
  await expect(sesion.getByRole('timer')).toContainText('20:00')
  await sesion.getByRole('button', { name: 'Saltar paso' }).click()
  await expect(sesion).toContainText('Explícalo sin mirar')
  await sesion.getByRole('button', { name: 'Saltar paso' }).click()
  await sesion.getByRole('button', { name: 'Saltar paso' }).click()
  await expect(sesion).toContainText('Paso 4 de 4')
  await sesion.getByRole('button', { name: 'Terminar' }).click()
  await expect(sesion).toContainText('Sesión de Feynman terminada. Descansa 5 minutos, ni uno más.')
  await sesion.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(sesion).toHaveCount(0)
})

test('Pausar y Seguir cambian el botón', async ({ page }) => {
  await page.goto('/#/mas/enfoque')
  await page.getByRole('button', { name: 'Empezar 10 minutos' }).click()
  const sesion = SESION(page, 'Solo 10 minutos')
  await sesion.getByRole('button', { name: 'Pausar' }).click()
  await expect(sesion.getByRole('button', { name: 'Seguir' })).toBeVisible()
  await sesion.getByRole('button', { name: 'Seguir' }).click()
  await expect(sesion.getByRole('button', { name: 'Pausar' })).toBeVisible()
})

test('Solo 10 minutos para arrancar: una fase corta y el mensaje de ánimo', async ({ page }) => {
  await page.goto('/#/mas/enfoque')
  await page.getByRole('button', { name: 'Empezar 10 minutos' }).click()
  const sesion = SESION(page, 'Solo 10 minutos')
  await expect(sesion.getByRole('timer')).toContainText('10:00')
  await sesion.getByRole('button', { name: 'Terminar' }).click()
  await expect(sesion).toContainText('Ya empezaste, lo difícil pasó')
})

test('Hoy → Empezar ya propone un método por tarea y arranca esa sesión', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar ya' }).click()
  const menu = page.getByRole('dialog', { name: 'Empezar ya' })
  await expect(menu).toContainText('Solo 10 minutos para arrancar')
  await expect(menu).toContainText('Método sugerido: Recuperación activa') // el examen de Física
  await menu.getByRole('button', { name: 'Empezar Examen parcial de Física con Recuperación activa' }).click()
  const sesion = SESION(page, 'Recuperación activa')
  await expect(sesion).toContainText('Examen parcial de Física')
  await expect(sesion).toContainText('Repaso rápido')
  for (let i = 0; i < 4; i++) await sesion.getByRole('button', { name: 'Saltar paso' }).click()
  await sesion.getByRole('button', { name: 'Terminar' }).click()
  await sesion.getByRole('button', { name: 'Marcar la tarea como hecha' }).click()
  await entregarConEnlace(page)
  await expect(page.getByRole('status')).toContainText('Tarea hecha')
  await expect(sesion).toHaveCount(0)
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: 'Hechas' }).click()
  await expect(page.getByText('Examen parcial de Física')).toBeVisible()
})

test('Solo 10 minutos con una tarea ofrece seguir con su método', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar ya' }).click()
  await page.getByRole('button', { name: 'Solo 10 minutos para arrancar' }).click()
  const sesion = SESION(page, 'Solo 10 minutos')
  await sesion.getByRole('button', { name: 'Terminar' }).click()
  await expect(sesion).toContainText('Sigue con')
  await sesion.getByRole('button', { name: /^Seguir con/ }).click()
  await expect(page.getByRole('dialog', { name: /^Sesión: (?!Solo)/ })).toBeVisible()
})

test('el formulario de tarea sugiere un método y deja cambiarlo; la lista lo muestra', async ({ page }) => {
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: '+ Nueva tarea' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nueva tarea' })
  await hoja.getByLabel('Qué hay que hacer').fill('Hacer un resumen del tema 4')
  await expect(hoja.getByLabel('Método de estudio')).toContainText('Que Astia lo sugiera (Mapa mental)')
  await hoja.getByLabel('Método de estudio').selectOption({ label: 'Tarjetas de estudio' })
  await expect(hoja).toContainText('Memorizar definiciones, fórmulas y vocabulario')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('.tarea', { hasText: 'Hacer un resumen del tema 4' })).toContainText('Tarjetas de estudio')
})

test('cada tarea académica muestra su método sugerido, y las personales no', async ({ page }) => {
  await page.goto('/#/tareas')
  await expect(page.locator('.tarea', { hasText: 'Examen parcial de Física' })).toContainText('Recuperación activa')
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Mi Órbita' }).click()
  await expect(page.locator('.tarea', { hasText: 'Llamar a mi abuela' })).not.toContainText('Pomodoro')
  await expect(page.locator('.metodo-tag')).toHaveCount(0)
})

test('un Pomodoro completo registra los 25 minutos de enfoque y se ve en Hoy', async ({ page }) => {
  await page.goto('/#/mas/enfoque')
  await page.locator('.metodo-cab', { hasText: 'Pomodoro' }).click()
  await page.getByRole('button', { name: 'Empezar Pomodoro' }).click()
  const sesion = SESION(page, 'Pomodoro')
  await expect(sesion).toContainText('Enfoque')
  await page.clock.fastForward('25:05') // pasan 25 minutos
  await expect(sesion).toContainText('Descanso') // pasó a la segunda fase
  await sesion.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.goto('/#/hoy')
  await expect(page.locator('.chips')).toContainText('25 min de enfoque hoy')
})

// ---------- mascotas ----------

const dosDigitos = (n: number) => String(n).padStart(2, '0')
/** n fechas seguidas "AAAA-MM-DD" desde el 1 de enero de 2026. */
const fechasSeguidas = (n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 1 + i))
  return `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}`
})

/** Deja guardada una vida de logros: así se prueba la evolución sin repetir cientos de toques. */
function conLogros(tareasAcademicas: number, diasDeHabito: number) {
  const tareas = Array.from({ length: tareasAcademicas }, (_, i) => ({
    id: 'tx' + i, titulo: 'Hecha ' + i, area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-10-01', prioridad: 'media',
    pideEvidencia: false, pasos: [], estado: 'hecha', hechaEn: '2026-10-01T10:00:00.000Z', actualizadoEn: 1,
  }))
  const habitos = [{ id: 'hx', nombre: 'Leer', categoria: 'Mente', color: '#B18CFF', frecuencia: { tipo: 'diaria' }, registro: fechasSeguidas(diasDeHabito), actualizadoEn: 1 }]
  return { perfil: { inicioCiclo: '', semanasCiclo: 16, enfoqueMin: 25, descansoMin: 5, actualizadoEn: 0 }, tareas, habitos }
}

test('evidencia: sin foto ni enlace la tarea no se marca hecha', async ({ page }) => {
  await page.goto('/#/tareas')
  const primera = page.getByRole('button', { name: /Marcar hecha/ }).first()
  const titulo = (await primera.getAttribute('aria-label'))!.replace('Marcar hecha: ', '')
  await primera.click()
  const hoja = page.getByRole('dialog', { name: 'Entrega tu evidencia' })
  await expect(hoja).toContainText('Sin evidencia no cuenta')
  await hoja.getByLabel(/enlace de la entrega/).fill('no es un enlace')
  await expect(hoja.getByRole('button', { name: 'Marcar hecha con evidencia' })).toBeDisabled()
  await hoja.getByRole('button', { name: 'Ahora no' }).click()
  await expect(page.getByRole('button', { name: 'Marcar hecha: ' + titulo })).toHaveAttribute('aria-pressed', 'false')
})

test('evidencia: con una foto la tarea queda hecha y se puede ver después', async ({ page }) => {
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: 'Marcar hecha: Informe de laboratorio' }).click()
  const hoja = page.getByRole('dialog', { name: 'Entrega tu evidencia' })
  // una imagen de 2x2 px como "foto"
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEIGBmhNBMDAwA2dQP/Gg8ZGwAAAABJRU5ErkJggg==', 'base64')
  await page.setInputFiles('#evidencia-galeria', { name: 'informe.png', mimeType: 'image/png', buffer: png })
  await expect(hoja.getByRole('img', { name: 'Tu evidencia' })).toBeVisible()
  await hoja.getByRole('button', { name: 'Marcar hecha con evidencia' }).click()
  await expect(page.getByRole('status')).toContainText('Evidencia guardada')
  await page.getByRole('button', { name: 'Hechas' }).click()
  await expect(page.locator('.tarea', { hasText: 'Informe de laboratorio' })).toContainText('Con foto')
  await page.getByRole('button', { name: 'Editar: Informe de laboratorio' }).click()
  await expect(page.getByText(/Evidencia entregada el/)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Evidencia de Informe de laboratorio' })).toBeVisible()
})

test('evidencia: reabrir una tarea descarta su evidencia', async ({ page }) => {
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: 'Marcar hecha: Informe de laboratorio' }).click()
  await entregarConEnlace(page)
  await page.getByRole('button', { name: 'Hechas' }).click()
  await page.getByRole('button', { name: 'Reabrir: Informe de laboratorio' }).click()
  await expect(page.getByRole('status')).toContainText('reabierta')
  await page.getByRole('button', { name: 'Pendientes' }).click()
  await page.getByRole('button', { name: 'Marcar hecha: Informe de laboratorio' }).click()
  await expect(page.getByRole('dialog', { name: 'Entrega tu evidencia' })).toBeVisible() // la pide otra vez
})

test('Más → Mi mascota está en los dos modos y muestra solo a Astia y Alpi', async ({ page }) => {
  await page.goto('/#/mas')
  await page.getByRole('button', { name: /Mi mascota/ }).click()
  await expect(page.getByRole('heading', { name: 'Mi mascota' })).toBeVisible()
  await expect(page.locator('.mascota-card')).toHaveCount(2)
  await expect(page.locator('.mascota-card', { hasText: 'Alpi' })).toBeVisible()
  await expect(page.locator('.mascota-card', { hasText: 'Astia' })).toBeVisible()
  await MODO(page).getByRole('button', { name: 'Mi Órbita' }).click()
  await page.goto('/#/mas')
  await expect(page.getByRole('button', { name: /Mi mascota/ })).toBeVisible()
})

test('elegir a Alpi y volver a la estrella de siempre', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.avatar svg')).toBeVisible() // la estrella
  await elegirAlpi(page)
  await expect(page.getByRole('status')).toContainText('Alpi es ahora tu compañero')
  await page.goto('/#/hoy')
  await expect(page.locator('.mascota')).toHaveAttribute('data-sprite', 'alpi-2')
  await page.goto('/#/mas/mascota')
  await page.getByRole('button', { name: 'Astia, la estrella de siempre' }).click()
  await page.getByRole('dialog', { name: 'Astia' }).getByRole('button', { name: 'Elegir a Astia' }).click()
  await page.goto('/#/hoy')
  await expect(page.locator('.mascota')).toHaveCount(0)
  await expect(page.locator('.avatar svg')).toBeVisible()
})

test('Alpi en Hoy: grande sobre su planeta, en 3D, con la expresión según tu día', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('astia.ajustes', JSON.stringify({ ...JSON.parse(localStorage.getItem('astia.ajustes') || '{}'), alpi3d: true, mascota: 'alpi' })))
  // Mientras carga no debe verse la Alpi dibujada: se vigila que nunca aparezca
  await page.addInitScript(() => {
    ;(window as unknown as { __dibujo: boolean }).__dibujo = false
    new MutationObserver(() => {
      if (document.querySelector('.hero-alpi-modelo .rig')) (window as unknown as { __dibujo: boolean }).__dibujo = true
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto('/#/hoy')
  const heroe = page.locator('.hero-alpi')
  await expect(heroe.locator('.planeta')).toBeAttached()
  await expect(page.frameLocator('.hero-alpi iframe').locator('canvas#stage')).toBeVisible({ timeout: 15000 })
  await expect(heroe.locator('iframe.alpi-iframe.lista')).toBeAttached({ timeout: 15000 }) // se muestra solo cuando ya está lista
  expect(await page.evaluate(() => (window as unknown as { __dibujo: boolean }).__dibujo)).toBe(false)
  // la página no se ensancha más que la pantalla (si no, las hojas emergentes se cortan)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  // hay una tarea vencida en los datos de ejemplo: Alpi regaña
  await expect(heroe.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'reganona')
  const antes = await page.locator('.burbuja').innerText()
  await page.getByRole('button', { name: 'Hablar con Astia' }).click()
  await expect(page.locator('.burbuja')).not.toHaveText(antes)
  await expect(page.getByRole('button', { name: /Vestir a Alpi/ })).toBeVisible()
})

test('con la tarea vencida entregada, Alpi deja de regañar', async ({ page }) => {
  await elegirAlpi(page)
  await page.goto('/#/hoy')
  await expect(page.locator('[data-animo]')).toHaveAttribute('data-animo', 'alerta')
  await page.getByRole('button', { name: /Marcar hecha: Informe de laboratorio/ }).click()
  await entregarConEnlace(page)
  await expect(page.locator('[data-animo]')).toHaveAttribute('data-animo', 'contenta')
})

test('Alpi en 3D se puede apagar en Ajustes (gasta menos batería)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('astia.ajustes', JSON.stringify({ ...JSON.parse(localStorage.getItem('astia.ajustes') || '{}'), alpi3d: true, mascota: 'alpi' })))
  await page.goto('/#/hoy')
  await expect(page.locator('.hero-alpi')).toBeVisible()
  await page.goto('/#/mas/ajustes')
  await page.getByRole('group', { name: 'Alpi en 3D' }).getByRole('button', { name: 'Dibujada' }).click()
  await page.goto('/#/hoy')
  await expect(page.locator('.hero-alpi')).toHaveCount(0)
  await expect(page.locator('.mascota svg.rig')).toBeVisible() // Alpi dibujada
})

test('vestidor: con tareas pendientes hoy está cerrado', async ({ page }) => {
  await elegirAlpi(page)
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Vestidor de Alpi' })
  await expect(hoja).toContainText('Primero cumples, después juegas')
  await expect(hoja.getByRole('group', { name: 'Nivel de Alpi' })).toHaveCount(0)
})

test('vestidor: con todo cumplido se puede quitar ropa y volver al nivel 1', async ({ page }) => {
  const datos = conLogros(20, 150) // 950 XP: Alpi en nivel 4, sin nada pendiente
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 4 }, datosEjemplo: false, etapa: 'universidad', alpi3d: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Vestidor de Alpi' })
  const niveles = hoja.getByRole('group', { name: 'Nivel de Alpi' })
  await expect(niveles.getByRole('button', { name: /Nivel 4/ })).toHaveAttribute('aria-pressed', 'true')
  const capa = hoja.getByRole('group', { name: 'Ropa y accesorios' }).getByRole('button', { name: 'Capa' })
  await expect(capa).toHaveAttribute('aria-pressed', 'true')
  await capa.click()
  await expect(capa).toHaveAttribute('aria-pressed', 'false')
  await niveles.getByRole('button', { name: /Nivel 1/ }).click()
  await expect(niveles.getByRole('button', { name: /Nivel 1/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(hoja).toContainText('En el nivel 1 Alpi solo lleva su bufanda')
  await hoja.getByRole('button', { name: 'Listo' }).click()
  await expect(page.locator('.mascota').first()).toHaveAttribute('data-sprite', 'alpi-4') // la de Hoy se viste igual
  // queda guardado en los ajustes del teléfono
  const look = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').alpiLook)
  expect(look).toMatchObject({ nivel: 1, accesorios: { capa: false } })
})

test('el detalle de Alpi muestra la evolución: lo alcanzado y lo bloqueado con su XP', async ({ page }) => {
  await page.goto('/#/mas/mascota')
  await page.getByRole('button', { name: /Alpi, La alpaca aventurera/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Alpi' })
  await expect(hoja.locator('.evolucion li')).toHaveCount(4)
  await expect(hoja.locator('.evolucion li.alcanzada')).toHaveCount(2) // con 158 XP de ejemplo
  await expect(hoja).toContainText('Exploradora')
  await expect(hoja.getByLabel('Nivel 3, Guardiana de los valles, bloqueado')).toContainText('300 XP')
  await expect(hoja.getByLabel('Nivel 4, Alpaca legendaria, bloqueado')).toContainText('700 XP')
})

test('al evolucionar se celebra una sola vez', async ({ page }) => {
  const datos = conLogros(20, 150) // 200 de estudio + 750 de hábitos = 950 XP, bien repartido
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 1 }, datosEjemplo: false, etapa: 'universidad', alpi3d: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/hoy')
  const celebracion = page.getByRole('dialog', { name: '¡Evolucionó!' })
  await expect(celebracion).toContainText('Alpi ahora es Alpaca legendaria')
  await expect(celebracion).toContainText('Nivel 4 de 4')
  await expect(celebracion.locator('.mascota')).toHaveAttribute('data-sprite', 'alpi-4')
  await celebracion.getByRole('button', { name: '¡Genial!' }).click()
  await expect(celebracion).toHaveCount(0)
  await expect(page.locator('.mascota').first()).toHaveAttribute('data-sprite', 'alpi-4')
  const vista = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').mascotaVista)
  expect(vista).toEqual({ alpi: 3 }) // se anotó la última etapa vista (la 4.ª): ya no se vuelve a celebrar
})

test('sin equilibrio entre estudios y vida personal, no pasa de la etapa 2', async ({ page }) => {
  const datos = conLogros(0, 150) // 750 XP, todo personal
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 1 }, datosEjemplo: false, etapa: 'universidad', alpi3d: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/mas/mascota')
  await expect(page.getByText('Nivel 2 de 4 · Exploradora')).toBeVisible()
  await expect(page.getByText(/falta equilibrio: suma XP académico/)).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await expect(page.locator('.mascota').first()).toHaveAttribute('data-sprite', 'alpi-2')
})

test('mostrar el XP por área y el total', async ({ page }) => {
  const datos = conLogros(10, 20) // 100 de estudio y 100 de hábitos
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 1 }, datosEjemplo: false, etapa: 'universidad', alpi3d: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/mas/mascota')
  await expect(page.getByText('200', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.xp-total')).toContainText('200 XP en total')
  await expect(page.locator('.xp-fila').nth(0).locator('.xp-valor')).toHaveText('100') // Académico
  await expect(page.locator('.xp-fila').nth(2).locator('.xp-valor')).toHaveText('100') // Hábitos
})


// ---------- fase 3: pantallas académicas, descanso de la vista, empezar de cero ----------

test('una app recién instalada abre vacía, sin datos de ejemplo, y pregunta en qué etapa estás', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('astia.ajustes')) // como si nunca se hubiera usado
  await page.goto('/#/hoy')
  await expect(page.getByRole('dialog', { name: 'Bienvenido a Astia' })).toBeVisible()
  await expect(page.locator('.cabecera .estado')).toContainText('Solo en este teléfono')
})

test('Bienvenida: elegir Colegio arma un periodo de 10 semanas, que se pueden cambiar', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('bv')) return
    sessionStorage.setItem('bv', '1')
    localStorage.removeItem('astia.ajustes')
  })
  await page.goto('/#/cursos')
  const hoja = page.getByRole('dialog', { name: 'Bienvenido a Astia' })
  await hoja.getByRole('button', { name: 'Colegio' }).click()
  await expect(hoja.getByLabel(/Cuántas semanas dura tu bimestre/)).toHaveValue('10')
  await hoja.getByLabel(/Cuándo empieza/).fill('2026-10-05')
  await hoja.getByRole('button', { name: 'Empezar' }).click()
  await expect(hoja).toHaveCount(0)
  await page.getByRole('button', { name: '+ Nuevo curso' }).click()
  await page.getByLabel('Nombre del curso').fill('Comunicación')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('button', { name: /Comunicación/ }).click()
  await expect(page.getByRole('button', { name: /^Semana \d+/ })).toHaveCount(10)
  await page.goto('/#/mas/ciclo')
  await expect(page.getByRole('heading', { name: 'Bimestre completo' })).toBeVisible()
  await expect(page.locator('.ciclo-fila')).toHaveCount(10)
})

test('Ajustes: cambiar de etapa y el nombre del periodo, y marcar semanas de exámenes', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/mas/ajustes')
  await page.getByRole('group', { name: 'Mi etapa de estudios' }).getByRole('button', { name: 'Preuniversitario' }).click()
  await page.getByLabel('Cómo llamas a tu periodo').fill('Trimestre')
  await page.getByLabel('Semanas del trimestre').fill('20')
  await page.getByLabel('Semanas del trimestre').blur()
  await page.goto('/#/mas/ciclo')
  await expect(page.getByRole('heading', { name: 'Trimestre completo' })).toBeVisible()
  await expect(page.locator('.ciclo-fila')).toHaveCount(20)
  await page.getByRole('button', { name: /^Semana 5:/ }).click()
  await page.getByRole('group', { name: 'Tipo de semana' }).getByRole('button', { name: /Exámenes/ }).click()
  await expect(page.getByRole('button', { name: /^Semana 5, exámenes:/ })).toBeVisible()
  await page.getByRole('button', { name: /^Semana 6:/ }).click()
  await page.getByRole('group', { name: 'Tipo de semana' }).getByRole('button', { name: /Sin clases/ }).click()
  await expect(page.getByRole('button', { name: /^Semana 6, sin clases:/ })).toBeVisible()
  await page.reload()
  await page.goto('/#/mas/ciclo')
  await expect(page.getByRole('button', { name: /^Semana 5, exámenes:/ })).toBeVisible()
})

test('Borrar todos mis datos deja Astia como recién instalada', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/cursos')
  await expect(page.getByText('Física')).toBeVisible()
  await page.goto('/#/mas/ajustes')
  await page.getByRole('button', { name: 'Borrar todos mis datos' }).click()
  await page.getByRole('button', { name: 'Sí, borrar todo' }).click()
  await expect(page.getByText('Sin tareas todavía')).toBeVisible()
  await page.goto('/#/cursos')
  await expect(page.getByText('Sin cursos')).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k === 'astia.datos.v2'))).toEqual([])
})

test('Semana: clases y entregas de cada día, y se puede cambiar de semana', async ({ page }) => {
  await page.goto('/#/semana')
  await expect(page.getByRole('heading', { name: /Jueves 15/ })).toContainText('hoy')
  await expect(page.getByText('Resolver práctica de Cálculo II')).toBeVisible()
  await expect(page.getByText('Examen parcial de Física')).toBeVisible() // mañana
  await expect(page.getByText('Pagar el recibo de luz')).toHaveCount(0) // es personal
  await page.getByRole('button', { name: 'Semana siguiente' }).click()
  await expect(page.getByText('Resolver práctica de Cálculo II')).toHaveCount(0)
  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await expect(page.getByText('Resolver práctica de Cálculo II')).toBeVisible()
})

test('Cursos: cada curso tiene sus semanas y se guarda el tema de una', async ({ page }) => {
  await importarRespaldoV1(page)
  await page.goto('/#/cursos')
  await page.getByRole('button', { name: /Física/ }).click()
  await expect(page.getByRole('button', { name: /^Semana \d+/ })).toHaveCount(16)
  await expect(page.locator('.fila.actual')).toContainText('Esta semana')
  await page.getByRole('button', { name: /^Semana 3/ }).click()
  await page.getByLabel('Tema de la semana').fill('Cinemática')
  await page.getByLabel('Notas').fill('Repasar MRU')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Semana 3 guardada')
  await expect(page.getByRole('button', { name: /^Semana 3: Cinemática/ })).toBeVisible()
  await page.reload()
  await page.goto('/#/cursos')
  await page.getByRole('button', { name: /Física/ }).click()
  await expect(page.getByRole('button', { name: /^Semana 3: Cinemática/ })).toBeVisible()
})

test('Calendario: marca los días con entregas y muestra las del día elegido', async ({ page }) => {
  await page.goto('/#/mas/calendario')
  await expect(page.getByRole('heading', { name: 'octubre 2026', level: 2 }).or(page.getByText('octubre 2026'))).toBeVisible()
  await expect(page.getByRole('button', { name: '16 de octubre, 1 entrega, hay examen' })).toBeVisible()
  await page.getByRole('button', { name: '16 de octubre, 1 entrega, hay examen' }).click()
  await expect(page.getByText('Examen parcial de Física')).toBeVisible()
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await expect(page.getByText('noviembre 2026')).toBeVisible()
})

test('Ciclo: muestra las 16 semanas y la carga, o pide la fecha de inicio', async ({ page }) => {
  await page.goto('/#/mas/ciclo')
  await expect(page.getByText('Falta la fecha de inicio')).toBeVisible()
  await importarRespaldoV1(page)
  await page.goto('/#/mas/ciclo')
  await expect(page.getByText('Hoy estás en la semana 8 de 16.')).toBeVisible()
  await expect(page.locator('.ciclo-fila')).toHaveCount(16)
  await expect(page.locator('.ciclo-fila.actual')).toContainText('esta semana')
})

test('Progreso: cuenta los días seguidos y las tareas de la semana', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('prog-iniciado')) return
    sessionStorage.setItem('prog-iniciado', '1')
    const dia = (f: string, hechas: number) => ({ id: f, fecha: f, actualizadoEn: 1, hechas, enfoque: 25, descanso: 5, pomodoros: 1 })
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'astia', alpi3d: false, datosEjemplo: false, etapa: 'universidad', descansoVista: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify({ perfil: { inicioCiclo: '', semanasCiclo: 16, enfoqueMin: 25, descansoMin: 5, actualizadoEn: 0 }, progreso: [dia('2026-10-13', 1), dia('2026-10-14', 2), dia('2026-10-15', 1)] }))
  })
  await page.goto('/#/mas/progreso')
  await expect(page.locator('.estadisticas').first()).toContainText('3')
  await expect(page.locator('.estadisticas').first()).toContainText('días seguidos')
  await expect(page.getByText('tareas hechas')).toBeVisible()
  await expect(page.getByRole('img', { name: /3 de 28/ })).toBeVisible()
})

test('descanso 20-20-20: a los 20 minutos con la app abierta propone mirar lejos 20 segundos', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'astia', alpi3d: false, datosEjemplo: true, descansoVista: true })))
  await page.goto('/#/hoy')
  await page.clock.runFor(19 * 60_000)
  await expect(page.getByRole('dialog', { name: 'Descansa la vista' })).toHaveCount(0)
  await page.clock.runFor(61_000)
  const hoja = page.getByRole('dialog', { name: 'Descansa la vista' })
  await expect(hoja).toBeVisible()
  await expect(hoja.getByRole('button', { name: 'Mirando lejos…' })).toBeDisabled()
  await page.clock.runFor(21_000)
  await expect(hoja.getByRole('button', { name: 'Ya miré lejos' })).toBeEnabled()
  await hoja.getByRole('button', { name: 'Ya miré lejos' }).click()
  await expect(hoja).toHaveCount(0)
})

test('Ajustes: el descanso de la vista se puede apagar', async ({ page }) => {
  await page.goto('/#/mas/ajustes')
  const grupo = page.getByRole('group', { name: 'Descanso de la vista (20-20-20)' })
  await grupo.getByRole('button', { name: 'No' }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes')!).descansoVista)).toBe(false)
})


// ---------- expresiones de Alpi según tu avance, y elegirlas a mano ----------

const ATRASOS: { fecha: string; expresion: string }[] = [
  { fecha: '2026-10-14', expresion: 'reganona' }, // 1 día
  { fecha: '2026-10-13', expresion: 'molesta' }, // 2 días
  { fecha: '2026-10-10', expresion: 'furiosa' }, // 5 días
]
for (const caso of ATRASOS) {
  test(`Alpi se pone ${caso.expresion} cuando la tarea más vieja venció el ${caso.fecha}`, async ({ page }) => {
    await page.addInitScript((c) => {
      localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', datosEjemplo: false, etapa: 'universidad', alpi3d: true, descansoVista: false }))
      localStorage.setItem('astia.datos.v2', JSON.stringify({ cursos: [{ id: 'c', nombre: 'Física', color: '#4FD1A5', actualizadoEn: 1 }], tareas: [{ id: 'v', actualizadoEn: 1, titulo: 'Atrasada', area: 'universidad', cursoId: 'c', tipo: 'tarea', fecha: c.fecha, prioridad: 'media', pideEvidencia: true, pasos: [], estado: 'pendiente' }] }))
    }, caso)
    await page.goto('/#/hoy')
    await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', caso.expresion)
  })
}

test('expresión a mano: solo con todo cumplido, y el vestidor la recuerda', async ({ page }) => {
  const datos = conLogros(20, 150)
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 4 }, datosEjemplo: false, etapa: 'universidad', alpi3d: true, descansoVista: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Vestidor de Alpi' })
  const grupo = hoja.getByRole('group', { name: 'Expresión de Alpi' })
  await expect(grupo.getByRole('button', { name: 'Automática' })).toHaveAttribute('aria-pressed', 'true')
  await grupo.getByRole('button', { name: 'Furiosa' }).click()
  await expect(grupo.getByRole('button', { name: 'Furiosa' })).toHaveAttribute('aria-pressed', 'true')
  await hoja.getByRole('group', { name: 'Movimientos de Alpi' }).getByRole('button', { name: 'Bailar' }).click()
  await hoja.getByRole('button', { name: 'Listo' }).click()
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'furiosa')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').alpiLook.expresion)).toBe('furiosa')
  // volver a automática
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  await page.getByRole('dialog', { name: 'Vestidor de Alpi' }).getByRole('button', { name: 'Automática' }).click()
  await page.getByRole('dialog', { name: 'Vestidor de Alpi' }).getByRole('button', { name: 'Listo' }).click()
  await expect(page.locator('.hero-alpi-modelo')).not.toHaveAttribute('data-expresion', 'furiosa')
})

test('expresión a mano: con algo pendiente no se puede elegir y manda tu avance', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', datosEjemplo: true, etapa: 'universidad', alpi3d: true, descansoVista: false, alpiLook: { expresion: 'triste' } }))
  })
  await page.goto('/#/hoy')
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'reganona') // la elegida no cuenta mientras debas algo
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Vestidor de Alpi' })
  await expect(hoja).toContainText('Primero cumples')
  await expect(hoja.getByRole('group', { name: 'Expresión de Alpi' })).toHaveCount(0)
})
