import { expect, test } from '@playwright/test'

// Todas las pruebas "viven" en el jueves 15 de octubre de 2026, 10:30 (así no dependen de la hora real:
// por ejemplo, de noche Astia se duerme y las rachas cambian).
test.beforeEach(async ({ page }) => {
  // El reloj arranca ahí y sigue corriendo; una prueba puede adelantarlo con fastForward
  await page.clock.install({ time: new Date(2026, 9, 15, 10, 30) })
  // Alpi en 3D viene por defecto, pero sin tarjeta gráfica (como en estas pruebas) ocupa todo el
  // procesador. Las pruebas usan la estrella y Alpi dibujada, salvo las que prueban el 3D.
  // Las pruebas corren sin nube ni cuenta de Google (Finanstia guarda sus datos en el navegador)
  await page.addInitScript(() => {
    try {
      localStorage.setItem('astia.sinNube', '1')
    } catch {
      /* sin almacenamiento */
    }
  })
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

test('evidencia: con una foto la tarea queda hecha y la foto se borra al confirmar', async ({ page }) => {
  await page.goto('/#/tareas')
  await page.getByRole('button', { name: 'Marcar hecha: Informe de laboratorio' }).click()
  const hoja = page.getByRole('dialog', { name: 'Entrega tu evidencia' })
  // una imagen de 2x2 px como "foto"
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEIGBmhNBMDAwA2dQP/Gg8ZGwAAAABJRU5ErkJggg==', 'base64')
  await page.setInputFiles('#evidencia-galeria', { name: 'informe.png', mimeType: 'image/png', buffer: png })
  await expect(hoja.getByRole('img', { name: 'Tu evidencia' })).toBeVisible()
  await hoja.getByRole('button', { name: 'Marcar hecha con evidencia' }).click()
  await expect(page.getByRole('status')).toContainText('Evidencia recibida')
  await page.getByRole('button', { name: 'Hechas' }).click()
  await expect(page.locator('.tarea', { hasText: 'Informe de laboratorio' })).toContainText('Con foto')
  await page.getByRole('button', { name: 'Editar: Informe de laboratorio' }).click()
  await expect(page.getByText(/Evidencia entregada el/)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Evidencia de Informe de laboratorio' })).toHaveCount(0) // la foto no se conserva
  await expect(page.getByText(/La foto se borra al confirmar/)).toBeVisible()
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
  await expect(page.locator('.mascota')).toHaveAttribute('data-sprite', 'alpi-1')
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
  await expect(heroe.locator('iframe.alpi-iframe.alpi-visible')).toBeAttached({ timeout: 15000 }) // se muestra solo cuando ya está lista
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
  const datos = conLogros(100, 400) // 1300 XP: Alpi en nivel 4, sin nada pendiente
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
  await expect(hoja.locator('.evolucion li.alcanzada')).toHaveCount(1) // con ~80 XP de ejemplo todavía es el nivel 1
  await expect(hoja.getByLabel('Nivel 2, Exploradora, bloqueado')).toContainText('130 XP')
  await expect(hoja.getByLabel('Nivel 3, Guardiana de los valles, bloqueado')).toContainText('510 XP')
  await expect(hoja.getByLabel('Nivel 4, Alpaca legendaria, bloqueado')).toContainText('1280 XP')
})

test('al evolucionar se celebra una sola vez', async ({ page }) => {
  const datos = conLogros(100, 400) // 500 de estudio + 800 de hábitos = 1300 XP, bien repartido
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 1 }, datosEjemplo: false, etapa: 'universidad', alpi3d: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/hoy')
  const celebracion = page.getByRole('dialog', { name: '¡Hora de evolucionar!' })
  await expect(celebracion).toContainText('Alpi está lista para ser Alpaca legendaria')
  await expect(celebracion.locator('.mascota')).toHaveAttribute('data-sprite', 'alpi-2') // primero se ve como estaba
  await expect(celebracion.getByRole('button', { name: '¡Evolucionar!' })).toBeEnabled()
  await celebracion.getByRole('button', { name: '¡Evolucionar!' }).click()
  const hecha = page.getByRole('dialog', { name: '¡Evolucionó!' })
  await expect(hecha).toContainText('Alpi ahora es Alpaca legendaria')
  await expect(hecha).toContainText('Nivel 4 de 4')
  await expect(hecha.locator('.mascota')).toHaveAttribute('data-sprite', 'alpi-4')
  await hecha.getByRole('button', { name: '¡Genial!' }).click()
  await expect(hecha).toHaveCount(0)
  await expect(page.locator('.mascota').first()).toHaveAttribute('data-sprite', 'alpi-4')
  const vista = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').mascotaVista)
  expect(vista).toEqual({ alpi: 3 }) // se anotó la última etapa vista (la 4.ª): ya no se vuelve a celebrar
})

async function falsearAudio(page: import('@playwright/test').Page, ajustes: object = { datosEjemplo: false, etapa: 'universidad', alpi3d: false }) {
  await page.addInitScript((ajustes) => {
    localStorage.setItem('astia.ajustes', JSON.stringify(ajustes))
    ;(window as any).__sonidos = 0
    class Falso {
      get currentTime() { return performance.now() / 1000 }
      state = 'running'
      destination = {}
      resume() { return Promise.resolve() }
      createGain() { const g: any = { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} }, connect: () => g, disconnect() {} }; return g }
      createOscillator() { (window as any).__sonidos++; const o: any = { type: '', frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, detune: { value: 0 }, connect: () => o, start() {}, stop() {}, disconnect() {} }; return o }
      createBiquadFilter() { const f: any = { type: '', frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: { value: 0 }, connect: () => f }; return f }
      createBuffer() { return { getChannelData: () => new Float32Array(10) } }
      createBufferSource() { (window as any).__sonidos++; const n: any = { buffer: null, loop: false, connect: () => n, start() {}, stop() {} }; return n }
      get sampleRate() { return 44100 }
    }
    ;(window as any).AudioContext = Falso
    ;(window as any).webkitAudioContext = Falso
  }, ajustes)
}

test('Sonidos: se puede escoger uno de la biblioteca, silenciar y subir uno propio', async ({ page }) => {
  await falsearAudio(page)
  await page.goto('/#/mas/sonidos')
  await expect(page.getByRole('heading', { name: 'Sonidos', exact: true })).toBeVisible()
  await expect(page.getByLabel('Sonido: Cuando Alpi evoluciona')).toHaveValue('alpi') // predeterminado: el de Alpi
  await page.getByRole('button', { name: 'Probar el sonido de Cuando Alpi evoluciona' }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__sonidos)).toBeGreaterThan(0)
  await page.getByLabel('Sonido: Cuando Alpi evoluciona').selectOption('silencio')
  await expect(page.getByRole('button', { name: 'Probar el sonido de Cuando Alpi evoluciona' })).toBeDisabled()
  await page.getByLabel('Sonido: Cuando cumples una tarea o un hábito').selectOption('moneda')
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').sonidos)
  expect(prefs.eventos).toMatchObject({ evolucion: 'silencio', tareaHecha: 'moneda' })
  // un archivo que no es audio se rechaza
  const elegir = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Subir mi sonido' }).first().click()
  await (await elegir).setFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') })
  await expect(page.getByRole('status').or(page.getByRole('alert')).filter({ hasText: /audio|archivo|sonido/i }).first()).toBeVisible()
  const sinPropio = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').sonidos?.propios)
  expect(sinPropio ?? {}).toEqual({})
})

test('la música de fondo empieza con el primer toque y se silencia desde la cabecera', async ({ page }) => {
  await falsearAudio(page)
  await page.goto('/#/hoy')
  await expect(page.getByRole('button', { name: 'Silenciar la música' })).toBeVisible()
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await expect.poll(() => page.evaluate(() => (window as any).__sonidos)).toBeGreaterThan(3) // ya suena
  await page.getByRole('button', { name: 'Silenciar la música' }).click()
  await expect(page.getByRole('button', { name: 'Activar la música' })).toBeVisible()
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').sonidos)
  expect(prefs.musica.activa).toBe(false)
})

test('Música: se elige volumen y se rechaza un archivo que no es audio', async ({ page }) => {
  await falsearAudio(page)
  await page.goto('/#/mas/sonidos')
  await expect(page.getByRole('radio', { name: /Astia \(predeterminada\)/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByLabel('Volumen').fill('0.8')
  await page.getByRole('group', { name: 'Música en toda la app' }).getByRole('button', { name: 'No' }).click()
  const elegir = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Subir mi música' }).click()
  await (await elegir).setFiles({ name: 'tarea.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') })
  await expect(page.getByRole('status').filter({ hasText: /audio/i })).toBeVisible()
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').sonidos.musica)
  expect(m).toMatchObject({ volumen: 0.8, activa: false })
  expect(m.propias ?? []).toEqual([])
})

test('dictar una tarea en Hoy: se entiende, se muestra en el formulario y se guarda al confirmar', async ({ page }) => {
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: 'Dictar', exact: true }).click()
  const dictado = page.getByRole('dialog', { name: 'Dictar una tarea' })
  await dictado.getByLabel('Lo que quieres anotar').fill('Examen de cálculo el viernes a las 3 de la tarde')
  await dictado.getByRole('button', { name: 'Entender' }).click()
  const form = page.getByRole('dialog', { name: 'Nueva tarea' })
  await expect(form.getByLabel(/Qué hay que hacer|Tarea|Título/i).first()).toHaveValue('Examen de cálculo')
  await expect(form.getByRole('button', { name: 'Examen' })).toHaveAttribute('aria-pressed', 'true')
  await form.getByRole('button', { name: /Guardar|Agregar/ }).click()
  await expect(page.getByText('Tarea agregada.')).toBeVisible()
})

test('Pregúntale a Astia: responde con tus datos, escribiendo o con las preguntas de ejemplo', async ({ page }) => {
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: 'Pregúntale a Astia' }).click()
  const hoja = page.getByRole('dialog', { name: 'Pregúntale a Astia' })
  await hoja.getByRole('button', { name: '¿Cuál es mi pendiente más urgente?' }).click()
  await expect(hoja.getByRole('status')).toContainText('Empieza por')
  await hoja.getByLabel('Tu pregunta').fill('qué clase me toca')
  await hoja.getByRole('button', { name: 'Preguntar', exact: true }).click()
  await expect(hoja.getByRole('status')).toContainText(/clase|clases/)
  await hoja.getByLabel('Tu pregunta').fill('cuál es la capital de Francia')
  await hoja.getByRole('button', { name: 'Preguntar', exact: true }).click()
  await expect(hoja.getByRole('status')).toContainText('No entendí esa pregunta')
})

test('si el iPhone no deja usar el reconocimiento de voz, explica qué hacer y esconde Hablar', async ({ page }) => {
  await page.addInitScript(() => {
    class Falso {
      lang = ''
      onerror: ((e: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      start() { setTimeout(() => { this.onerror?.({ error: 'service-not-allowed' }); this.onend?.() }, 10) }
      stop() {}
    }
    ;(window as any).webkitSpeechRecognition = Falso
  })
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: 'Pregúntale a Astia' }).click()
  const hoja = page.getByRole('dialog', { name: 'Pregúntale a Astia' })
  await hoja.getByRole('button', { name: 'Hablar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'micrófono del teclado' })).toBeVisible()
  await expect(hoja.getByRole('button', { name: 'Hablar' })).toHaveCount(0)
  await expect(hoja.getByText(/micrófono del teclado/).first()).toBeVisible()
})

test('sin equilibrio entre estudios y vida personal, no pasa de la etapa 2', async ({ page }) => {
  const datos = conLogros(0, 700) // 1400 XP, todo personal
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
  const datos = conLogros(20, 50) // 100 de estudio y 100 de hábitos
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

test('ruleta: con todo cumplido, tocar dos veces a Alpi abre emotes y movimientos', async ({ page }) => {
  test.setTimeout(90_000) // el 3D sin tarjeta gráfica es lento en estas pruebas
  await page.emulateMedia({ reducedMotion: 'reduce' }) // sin animaciones los botones están quietos al instante, aunque el 3D esté ocupando el procesador
  const datos = conLogros(100, 400)
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 4 }, datosEjemplo: false, etapa: 'universidad', alpi3d: true, descansoVista: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/hoy')
  await expect(page.getByText('Toca dos veces a Alpi')).toBeVisible()
  const lienzo = page.frameLocator('.hero-alpi iframe').locator('canvas#stage')
  await expect(lienzo).toBeVisible({ timeout: 15000 })
  await lienzo.dblclick()
  const emotes = page.getByRole('dialog', { name: 'Emotes de Alpi' })
  await expect(emotes).toBeVisible()
  await expect(emotes.getByRole('button', { name: /Automática/ })).toHaveAttribute('aria-pressed', 'true')
  await emotes.getByRole('button', { name: /Furiosa/ }).click()
  await expect(emotes).toHaveCount(0)
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'furiosa')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').alpiLook.expresion)).toBe('furiosa')
  // el centro cambia a la rueda de movimientos
  await lienzo.dblclick()
  await page.getByRole('button', { name: 'Ver movimientos' }).click()
  const movimientos = page.getByRole('dialog', { name: 'Movimientos de Alpi' })
  await expect(movimientos.getByRole('button')).toHaveCount(6) // 5 movimientos y el centro
  await movimientos.getByRole('button', { name: /Bailar/ }).click()
  await expect(movimientos).toHaveCount(0)
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'furiosa') // bailar no cambia la expresión fijada
  // volver a automática
  await lienzo.dblclick()
  await page.getByRole('dialog', { name: 'Emotes de Alpi' }).getByRole('button', { name: /Automática/ }).click()
  await expect(page.locator('.hero-alpi-modelo')).not.toHaveAttribute('data-expresion', 'furiosa')
})

test('el vestidor ya no trae listas de expresiones ni de movimientos', async ({ page }) => {
  const datos = conLogros(100, 400)
  await page.addInitScript((d) => {
    localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', mascotaVista: { alpi: 4 }, datosEjemplo: false, etapa: 'universidad', alpi3d: false, descansoVista: false }))
    localStorage.setItem('astia.datos.v2', JSON.stringify(d))
  }, datos)
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Vestidor de Alpi' })
  await expect(hoja.getByRole('group', { name: 'Ropa y accesorios' })).toBeVisible()
  await expect(hoja.getByRole('group', { name: 'Expresión de Alpi' })).toHaveCount(0)
  await expect(hoja.getByRole('group', { name: 'Movimientos de Alpi' })).toHaveCount(0)
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
  await hoja.getByRole('button', { name: 'Cerrar' }).first().click()
  // con algo pendiente, tocar dos veces a Alpi no abre la ruleta
  await expect(page.getByText('Toca dos veces a Alpi')).toHaveCount(0)
  await page.frameLocator('.hero-alpi iframe').locator('canvas#stage').dblclick()
  await expect(page.getByRole('dialog', { name: 'Emotes de Alpi' })).toHaveCount(0)
})


test('Mi mascota: las miniaturas de Alpi son sus fotos reales, por nivel', async ({ page }) => {
  await page.goto('/#/mas/mascota')
  const tarjeta = page.locator('.mascota-card', { hasText: 'Alpi' })
  await expect(tarjeta.locator('.mascota-mini.foto img')).toBeVisible()
  expect(await tarjeta.locator('.mascota-mini img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 100)).toBe(true)
  expect(await tarjeta.locator('.mascota-mini svg').count()).toBe(0) // ya no es el dibujo
  await tarjeta.click()
  const hoja = page.getByRole('dialog', { name: 'Alpi' })
  await expect(hoja.locator('.evolucion .mascota-mini.foto img')).toHaveCount(4)
  const bloqueadas = await hoja.locator('.evolucion .mascota-mini.bloqueada').count()
  expect(bloqueadas).toBeGreaterThan(0) // los niveles que aún no alcanzas salen como silueta
  expect(bloqueadas).toBeLessThan(4)
})

test('el 3D de Alpi no queda dentro de una caja con borde y sombra', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('astia.ajustes', JSON.stringify({ mascota: 'alpi', datosEjemplo: true, etapa: 'universidad', alpi3d: true, descansoVista: false, modoTema: 'oscuro' })))
  await page.goto('/#/hoy')
  const marco = page.locator('.hero-alpi iframe.alpi-iframe.alpi-visible')
  await expect(marco).toBeAttached({ timeout: 15000 })
  const estilo = await marco.evaluate((e) => { const c = getComputedStyle(e); return { borde: c.borderTopWidth, radio: c.borderTopLeftRadius, sombra: c.boxShadow, fondo: c.backgroundColor } })
  expect(estilo).toEqual({ borde: '0px', radio: '0px', sombra: 'none', fondo: 'rgba(0, 0, 0, 0)' })
})


// ---------- Finanstia: tu plata, con PIN, una sola cuenta y su propio Alpi ----------

async function ponerPin(page: import('@playwright/test').Page, pin: string) {
  for (const t of pin) await page.getByRole('button', { name: t, exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar PIN' }).click()
}

/** Entra a Finanstia y crea el PIN 1234 (la primera vez). */
async function entrarAFinanstia(page: import('@playwright/test').Page) {
  await page.goto('/#/hoy')
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Finanstia' }).click()
  await expect(page.getByRole('heading', { name: 'Crea tu PIN' })).toBeVisible()
  await ponerPin(page, '1234')
  await expect(page.getByRole('heading', { name: 'Confirma tu PIN' })).toBeVisible()
  await ponerPin(page, '1234')
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
}

async function registrar(page: import('@playwright/test').Page, tipo: 'Gasto' | 'Ingreso', monto: string, categoria: string) {
  await page.getByRole('button', { name: 'Registrar un movimiento' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await hoja.getByRole('group', { name: 'Tipo' }).getByRole('button', { name: tipo }).click()
  await hoja.getByLabel('Monto en soles').fill(monto)
  await hoja.getByRole('button', { name: categoria, exact: true }).click()
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
}

test('el selector tiene tres modos y Finanstia pide crear un PIN antes de mostrar nada', async ({ page }) => {
  await page.goto('/#/hoy')
  const modos = page.getByRole('group', { name: 'Modo' }).getByRole('button')
  await expect(modos).toHaveText(['Académico', 'Mi Órbita', 'Finanstia'])
  await modos.nth(2).click()
  await expect(page.getByRole('heading', { name: 'Crea tu PIN' })).toBeVisible()
  await expect(page.getByText('Saldo registrado')).toHaveCount(0) // la plata no se ve sin PIN
  await expect(page.getByRole('navigation').getByRole('button')).toHaveCount(0) // ni la barra de abajo
})

test('PIN: se crea con confirmación, no se guarda el número y vuelve a pedirse al salir y entrar', async ({ page }) => {
  await entrarAFinanstia(page)
  const guardado = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith('astia.finanzas.pin')).map(([, v]) => v).join('|'))
  expect(guardado).toContain('huella')
  expect(guardado).not.toContain('1234')
  // al pasar a otro modo se cierra
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Académico' }).click()
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Finanstia' }).click()
  await expect(page.getByRole('heading', { name: 'Finanstia', level: 1 })).toBeVisible()
  await ponerPin(page, '9999')
  await expect(page.getByRole('status').filter({ hasText: 'PIN incorrecto' })).toBeVisible()
  await ponerPin(page, '1234')
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
})

test('PIN: si no coinciden al crearlo, se vuelve a empezar', async ({ page }) => {
  await page.goto('/#/hoy')
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Finanstia' }).click()
  await ponerPin(page, '1234')
  await ponerPin(page, '4321')
  await expect(page.getByText('No coinciden')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Crea tu PIN' })).toBeVisible()
})

test('PIN: tras 5 errores seguidos hay que esperar', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Académico' }).click()
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Finanstia' }).click()
  for (let i = 0; i < 5; i++) await ponerPin(page, '0000')
  await expect(page.getByText(/Vuelve a intentar en \d+ s/)).toBeVisible()
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled()
})

test('PIN: "Olvidé mi PIN" confirma tu cuenta y deja crear uno nuevo', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Académico' }).click()
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Finanstia' }).click()
  await page.getByRole('button', { name: 'Olvidé mi PIN' }).click()
  await expect(page.getByRole('heading', { name: 'Crea tu PIN' })).toBeVisible()
  await ponerPin(page, '5555')
  await ponerPin(page, '5555')
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
})

test('Finanstia: el fondo son billetes (no estrellas) y los otros modos siguen con su cielo', async ({ page }) => {
  await entrarAFinanstia(page)
  await expect(page.locator('.fondo-dinero .billete-flota').first()).toBeAttached()
  await expect(page.locator('.estrellas')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-modo', 'finanzas')
  await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Académico' }).click()
  await expect(page.locator('.estrellas').first()).toBeAttached()
  await expect(page.locator('.fondo-dinero')).toHaveCount(0)
})

test('registrar ingresos y gastos actualiza el saldo, el resumen y los últimos movimientos', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Ingreso', '1500', 'Sueldo')
  await registrar(page, 'Gasto', '12,50', 'Almuerzos')
  await expect(page.getByRole('status')).toContainText('Gasto registrado')
  const digital = page.locator('.fz-billetera', { hasText: 'Digital' })
  await expect(digital).toContainText('S/ 1,487.50')
  await expect(page.locator('.fz-resumen-tarjeta.ingreso')).toContainText('S/ 1,500.00')
  await expect(page.locator('.fz-resumen-tarjeta.gasto')).toContainText('S/ 12.50')
  await expect(page.locator('.fz-mov', { hasText: 'Almuerzos' })).toContainText('−S/ 12.50')
  await expect(page.getByRole('button', { name: 'Ver movimientos de Almuerzos' })).toBeVisible() // la dona
})

test('un movimiento inválido muestra el error y no se guarda', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('button', { name: 'Registrar un movimiento' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByRole('alert')).toContainText('monto mayor que 0')
  await hoja.getByLabel('Monto en soles').fill('5')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByRole('alert')).toContainText('Elige una categoría')
})

test('editar y borrar un movimiento (con deshacer) corrige el saldo', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Gasto', '20', 'Pasajes')
  await page.locator('.fz-mov', { hasText: 'Pasajes' }).click()
  const hoja = page.getByRole('dialog', { name: 'Editar movimiento' })
  await hoja.getByLabel('Monto en soles').fill('30')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('−S/ 30.00')
  await page.locator('.fz-mov', { hasText: 'Pasajes' }).click()
  await page.getByRole('dialog', { name: 'Editar movimiento' }).getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('S/ 0.00')
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('−S/ 30.00')
})

test('una transferencia mueve plata entre Digital y Efectivo sin contar como gasto', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Ingreso', '200', 'Sueldo')
  await page.getByRole('button', { name: 'Transferir entre Digital y Efectivo' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await hoja.getByLabel('Monto en soles').fill('50')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Transferencia registrada')
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('S/ 150.00')
  await expect(page.locator('.fz-billetera', { hasText: 'Efectivo' })).toContainText('S/ 50.00')
  await expect(page.locator('.fz-resumen-tarjeta.gasto')).toContainText('S/ 0.00') // no es un gasto
})

test('el presupuesto avisa al 70 % y al pasarte del tope', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Presupuesto' }).click()
  await page.getByLabel('Tope mensual de Almuerzos').fill('100')
  await page.keyboard.press('Enter')
  await page.getByRole('navigation').getByRole('button', { name: 'Inicio' }).click()
  await registrar(page, 'Gasto', '75', 'Almuerzos')
  await expect(page.getByRole('status')).toContainText('va en 75 % de su presupuesto')
  await expect(page.getByRole('button', { name: /Presupuesto al 70 %/ })).toBeVisible()
  await registrar(page, 'Gasto', '40', 'Almuerzos')
  await expect(page.getByRole('status')).toContainText('pasó su presupuesto')
  await expect(page.getByRole('button', { name: /Presupuesto excedido/ })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Presupuesto' }).click()
  await expect(page.getByText('Te pasaste por S/ 15.00').first()).toBeVisible()
})

test('movimientos: buscar, filtrar por categoría y ver todo el historial', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Gasto', '12', 'Almuerzos')
  await registrar(page, 'Gasto', '8', 'Pasajes')
  await page.getByRole('navigation').getByRole('button', { name: 'Movimientos' }).click()
  await expect(page.locator('.fz-mov')).toHaveCount(2)
  await page.getByLabel('Buscar movimientos').fill('pasa')
  await expect(page.locator('.fz-mov')).toHaveCount(1)
  await page.getByLabel('Buscar movimientos').fill('')
  await page.getByRole('group', { name: 'Filtrar por categoría' }).getByRole('button', { name: 'Almuerzos' }).click()
  await expect(page.locator('.fz-mov')).toHaveCount(1)
  await page.getByRole('button', { name: 'Todo el historial' }).click()
  await expect(page.locator('.fz-mov')).toHaveCount(1)
  await page.getByLabel('Buscar movimientos').fill('zzz')
  await expect(page.getByText('Ningún movimiento coincide')).toBeVisible()
})

test('metas: crear, aportar, no retirar de más y cumplir', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('navigation').getByRole('button', { name: 'Metas' }).click()
  await page.getByRole('button', { name: 'Nueva meta' }).click()
  await page.getByLabel('Nombre').fill('Laptop')
  await page.getByLabel('Monto objetivo en soles').fill('1000')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('heading', { name: 'Laptop' })).toBeVisible()
  await page.getByRole('button', { name: 'Aportar' }).click()
  await page.getByRole('dialog').getByLabel('Monto en soles').fill('400')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('.fz-meta')).toContainText('40 %')
  await page.getByRole('button', { name: 'Retirar' }).click()
  await page.getByRole('dialog').getByLabel('Monto en soles').fill('500')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('más de lo ahorrado')
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Aportar' }).click()
  await page.getByRole('dialog').getByLabel('Monto en soles').fill('600')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Meta cumplida')
  await expect(page.getByText('¡Meta cumplida!').first()).toBeVisible()
  // el dinero de las metas no toca los saldos
  await page.getByRole('navigation').getByRole('button', { name: 'Inicio' }).click()
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('S/ 0.00')
})

test('ocultar montos difumina los números y se recuerda', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Ingreso', '300', 'Sueldo')
  await page.getByRole('button', { name: 'Ocultar montos' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-montos', 'ocultos')
  expect(await page.locator('.fz-billetera-saldo').first().evaluate((e) => getComputedStyle(e).filter)).toContain('blur')
  await page.getByRole('button', { name: 'Mostrar montos' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-montos', 'visibles')
})

test('Más en Finanstia: comparar periodos, respaldo, bloquear', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Gasto', '30', 'Extras')
  await page.getByRole('button', { name: 'Más opciones de Finanstia' }).click()
  await page.getByRole('button', { name: /Comparar periodos/ }).click()
  await expect(page.getByLabel('Tipo del periodo A')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'S/ 30.00' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  await page.getByRole('button', { name: /Respaldo de mis finanzas/ }).click()
  await expect(page.getByRole('heading', { name: 'Respaldo de mis finanzas' })).toBeVisible()
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  await page.getByRole('button', { name: /Bloquear Finanstia/ }).click()
  await expect(page.getByRole('heading', { name: 'Finanstia', level: 1 })).toBeVisible()
})

test('Alpi de Finanstia: en verde juega con billetes y en rojo pide plata, con su propio nivel', async ({ page }) => {
  await entrarAFinanstia(page)
  await expect(page.locator('.fz-hero')).toHaveAttribute('data-estado', 'neutro')
  await registrar(page, 'Ingreso', '500', 'Sueldo')
  await expect(page.locator('.fz-hero')).toHaveAttribute('data-estado', 'verde')
  await expect(page.locator('.fz-extras.verde .billete')).toHaveCount(4)
  await registrar(page, 'Gasto', '800', 'Tecnología')
  await expect(page.locator('.fz-hero')).toHaveAttribute('data-estado', 'rojo')
  await expect(page.locator('.fz-cartel')).toContainText('Una monedita')
  await expect(page.locator('.burbuja-alpi')).toContainText(/rojo|mendigando|gasto/i)
  await page.getByRole('link', { name: /Mi Alpi de Finanstia/ }).click()
  await expect(page.getByRole('heading', { name: 'Mi Alpi de Finanstia' })).toBeVisible()
  await expect(page.getByText(/Nivel 1 de 4/)).toBeVisible()
  await expect(page.getByText('Constancia')).toBeVisible()
})

test('sin sesión de Google no se ve nada de Astia: pide "Continuar con Google"', async ({ page }) => {
  // como en la app publicada: sin el atajo de la vista previa. Se quita antes de que cargue la app.
  await page.addInitScript(() => localStorage.removeItem('astia.sinNube'))
  await page.goto('/#/hoy')
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Tus estudios, tu vida y tu plata, con una sola cuenta.')).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

// ---------- Finanstia: ruleta de emotes, vestidor y dictado ----------

/** Deja guardada una vida de movimientos: así Alpi de Finanstia ya tiene nivel 2 sin repetir decenas de registros. */
function finanzasConHistorial() {
  const movimientos: Record<string, unknown> = { ing: { id: 'ing', tipo: 'ingreso', categoria: 'Sueldo', monto: 5000, fecha: '2026-08-01', medio: 'digital', nota: '', creado: 1 } }
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.UTC(2026, 8, 1 + i)) // 30 días distintos de septiembre y octubre
    const fecha = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    movimientos['g' + i] = { id: 'g' + i, tipo: 'gasto', categoria: 'Almuerzos', monto: 10, fecha, medio: 'digital', nota: '', creado: 2 + i }
  }
  return { config: { saldosCent: { digital: 470000, efectivo: 0 } }, movimientos, metas: {} }
}

test('Finanstia: ruleta de emotes y movimientos con doble toque, solo si no estás en rojo', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('astia.ajustes', JSON.stringify({ ...JSON.parse(localStorage.getItem('astia.ajustes') || '{}'), alpi3d: true, mascota: 'alpi' })))
  await entrarAFinanstia(page)
  await registrar(page, 'Ingreso', '500', 'Sueldo')
  await expect(page.getByText('Toca dos veces a Alpi')).toBeVisible()
  const lienzo = page.frameLocator('.hero-alpi iframe').locator('canvas#stage')
  await expect(lienzo).toBeVisible({ timeout: 15000 })
  await lienzo.dblclick()
  const emotes = page.getByRole('dialog', { name: 'Emotes de Alpi' })
  await expect(emotes).toBeVisible()
  await emotes.getByRole('button', { name: /Orgullosa/ }).click()
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'orgullosa')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').alpiLookFinanzas.expresion)).toBe('orgullosa')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}').alpiLook?.expresion)).toBeUndefined() // es otro Alpi: no toca al de estudios
  await lienzo.dblclick()
  await page.getByRole('button', { name: 'Ver movimientos' }).click()
  const movs = page.getByRole('dialog', { name: 'Movimientos de Alpi' })
  await expect(movs.getByRole('button')).toHaveCount(6)
  await movs.getByRole('button', { name: /Bailar/ }).click()
  await expect(movs).toHaveCount(0)
  // en rojo se cierra el juego: manda tu plata y la ruleta no se abre
  await registrar(page, 'Gasto', '900', 'Tecnología')
  await expect(page.locator('.fz-hero')).toHaveAttribute('data-estado', 'rojo')
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-expresion', 'triste')
  await expect(page.getByText('Toca dos veces a Alpi')).toHaveCount(0)
  await lienzo.dblclick()
  await expect(page.getByRole('dialog', { name: 'Emotes de Alpi' })).toHaveCount(0)
})

test('Finanstia: el vestidor deja quitar y poner ropa al Alpi de Finanstia (y se cierra en rojo)', async ({ page }) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('hist')) return
    sessionStorage.setItem('hist', '1')
    localStorage.setItem('astia.finanzas.local', JSON.stringify(e))
  }, finanzasConHistorial())
  await entrarAFinanstia(page)
  await expect(page.getByRole('link', { name: /Mi Alpi de Finanstia/ })).toContainText('Nivel 2 de 4')
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Vestidor de Alpi' })
  const niveles = hoja.getByRole('group', { name: 'Nivel de Alpi' })
  await expect(niveles.getByRole('button', { name: /Nivel 2/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(niveles.getByRole('button', { name: /Nivel 3/ })).toBeDisabled() // aún no lo alcanzas
  const chullo = hoja.getByRole('group', { name: 'Ropa y accesorios' }).getByRole('button', { name: 'Chullo' })
  await expect(chullo).toHaveAttribute('aria-pressed', 'true')
  await chullo.click()
  await expect(chullo).toHaveAttribute('aria-pressed', 'false')
  await niveles.getByRole('button', { name: /Nivel 1/ }).click()
  await expect(hoja).toContainText('En el nivel 1 Alpi solo lleva su bufanda')
  await hoja.getByRole('button', { name: 'Listo' }).click()
  const look = await page.evaluate(() => JSON.parse(localStorage.getItem('astia.ajustes') || '{}'))
  expect(look.alpiLookFinanzas).toMatchObject({ nivel: 1, accesorios: { chullo: false } })
  expect(look.alpiLook).toBeUndefined() // el Alpi de estudios no se tocó
  await expect(page.locator('.hero-alpi-modelo')).toHaveAttribute('data-nivel', '1')
  // en rojo, el vestidor se cierra
  await registrar(page, 'Gasto', '6000', 'Tecnología')
  await expect(page.locator('.fz-hero')).toHaveAttribute('data-estado', 'rojo')
  await page.getByRole('button', { name: /Vestir a Alpi/ }).click()
  await expect(page.getByRole('dialog', { name: 'Vestidor de Alpi' })).toContainText('Primero ordenas tu plata')
  await page.getByRole('dialog', { name: 'Vestidor de Alpi' }).getByRole('button', { name: 'Ver mi presupuesto' }).click()
  await expect(page.getByRole('heading', { name: 'Presupuesto', level: 1 })).toBeVisible()
})

async function dictar(page: import('@playwright/test').Page, frase: string) {
  const hoja = page.getByRole('dialog', { name: 'Dictar un movimiento' })
  await hoja.getByLabel('Frase del movimiento').fill(frase)
  await hoja.getByRole('button', { name: 'Entender' }).click()
  return hoja
}

test('dictar: un ingreso y un gasto se entienden, se muestran y se guardan al confirmar', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('button', { name: /Dictar un movimiento/ }).click()
  let hoja = await dictar(page, 'Me llegó un ingreso de 200 soles por sueldo')
  await expect(hoja.getByText('Entendí')).toBeVisible()
  await expect(hoja).toContainText('Ingreso')
  await expect(hoja).toContainText('S/ 200.00')
  await expect(hoja).toContainText('Categoría: Sueldo')
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('S/ 0.00') // todavía no se guardó nada
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Ingreso registrado')
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('S/ 200.00')

  await page.getByRole('button', { name: /Dictar un movimiento/ }).click()
  hoja = await dictar(page, 'ayer gasté quince soles en almuerzo con yape')
  await expect(hoja).toContainText('S/ 15.00')
  await expect(hoja).toContainText('Categoría: Almuerzos')
  await expect(hoja).toContainText('Fecha: Ayer')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Gasto registrado')
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('S/ 185.00')
})

test('dictar: si no está seguro de la categoría no guarda y deja corregir con todo ya rellenado', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('button', { name: /Dictar un movimiento/ }).click()
  const hoja = await dictar(page, 'gasté 40 soles en algo raro')
  await expect(hoja).toContainText('No encontré la categoría')
  await expect(hoja.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  await hoja.getByRole('button', { name: 'Corregir' }).click()
  const form = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(form.getByLabel('Monto en soles')).toHaveValue('40')
  await form.getByRole('button', { name: 'Extras', exact: true }).click()
  await form.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('.fz-billetera', { hasText: 'Digital' })).toContainText('−S/ 40.00')
})

test('dictar: una frase sin monto no se guarda y explica qué decir', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('button', { name: /Dictar un movimiento/ }).click()
  const hoja = await dictar(page, 'hola Alpi cómo estás')
  await expect(hoja.getByRole('alert')).toContainText('No escuché cuánto fue')
  await expect(hoja.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})

test('dictar: una transferencia y un aporte a una meta', async ({ page }) => {
  await entrarAFinanstia(page)
  await registrar(page, 'Ingreso', '300', 'Sueldo')
  await page.getByRole('navigation').getByRole('button', { name: 'Metas' }).click()
  await page.getByRole('button', { name: 'Nueva meta' }).click()
  await page.getByLabel('Nombre').fill('Laptop nueva')
  await page.getByLabel('Monto objetivo en soles').fill('1000')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Inicio' }).click()

  await page.getByRole('button', { name: /Dictar un movimiento/ }).click()
  let hoja = await dictar(page, 'pasé cincuenta soles de digital a efectivo')
  await expect(hoja).toContainText('De Digital a Efectivo')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('.fz-billetera', { hasText: 'Efectivo' })).toContainText('S/ 50.00')

  await page.getByRole('button', { name: /Dictar un movimiento/ }).click()
  hoja = await dictar(page, 'aporté 100 soles a mi laptop')
  await expect(hoja).toContainText('Meta: Laptop nueva')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toContainText('Aporte registrado')
  await page.getByRole('navigation').getByRole('button', { name: 'Metas' }).click()
  await expect(page.locator('.fz-meta')).toContainText('10 %')
})

test('registrar: desde el formulario se puede pasar a dictar', async ({ page }) => {
  await entrarAFinanstia(page)
  await page.getByRole('button', { name: 'Registrar un movimiento' }).click()
  await page.getByRole('dialog', { name: 'Nuevo movimiento' }).getByRole('button', { name: 'Mejor lo dicto' }).click()
  await expect(page.getByRole('dialog', { name: 'Dictar un movimiento' })).toBeVisible()
})
