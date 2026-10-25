// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { datosDeEjemplo } from '../../demo/datosEjemplo'
import { COLECCIONES, cambiosPendientes, aDocumento, type Coleccion } from './registros'
import { crearSync, type Entrega } from './syncFirestore'
import type { Registro } from '../../dominio/tipos'

// Las reglas reales de firestore.rules contra el emulador, y la capa de sincronización con "dos teléfonos".

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-finanzas', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const ana = () => env.authenticatedContext('ana').firestore()
const beto = () => env.authenticatedContext('beto').firestore()
const anon = () => env.unauthenticatedContext().firestore()
const ref = (db: ReturnType<typeof ana>, col: Coleccion, id: string) => doc(db, 'users', 'ana', 'estudios', col, 'registros', id)

const HOY = new Date(2026, 9, 15)
const ejemplo = datosDeEjemplo(HOY)
const extra = {
  recordatorios: [{ id: 'r1', texto: 'Comprar pan', cuando: '2026-10-15T15:40:00.000Z', avisado: false, calendarioId: 'ev1', actualizadoEn: 5 }],
  apuntes: [{ id: 'a1', texto: 'Hoy conseguí la beca', fecha: '2026-10-15', tipo: 'apunte' as const, actualizadoEn: 5 }, { id: 'a2', texto: 'Cumple', fecha: '2026-10-20', hora: '10:00', tipo: 'evento' as const, actualizadoEn: 5 }],
  mejoras: [{ id: 'm1', texto: 'Más colores', creadaEn: 1, hecha: false, actualizadoEn: 5 }],
  progreso: [{ id: '2026-10-15', fecha: '2026-10-15', hechas: 2, enfoque: 50, descanso: 5, pomodoros: 2, actualizadoEn: 5 }],
  planes: [{ id: '2026-10-15', fecha: '2026-10-15', tareaIds: ['a', 'b'], actualizadoEn: 5 }],
  semanas: [{ id: 's1', cursoId: 'c-calc', semana: 3, tema: 'Integrales', notas: 'Repasar', actualizadoEn: 5 }],
}
const datos = { ...ejemplo, ...extra }

describe('reglas de estudios', () => {
  test('todo el contenido real de la app (datos de ejemplo) pasa las reglas', async () => {
    const sync = crearSync(ana() as never, 'ana')
    const pend = cambiosPendientes(datos, new Map())
    expect(pend.registros.length).toBeGreaterThan(30)
    await assertSucceeds(sync.subir(pend.registros, { ...datos.perfil, inicioCiclo: '2026-08-24', actualizadoEn: 9 }))
    for (const col of COLECCIONES) expect((await getDocs(collection(ana() as never, 'users', 'ana', 'estudios', col, 'registros'))).size).toBe(datos[col].length)
  })
  test('cada colección acepta un registro borrado (con lápida)', async () => {
    const t = { ...datos.tareas[0], borradoEn: 99, actualizadoEn: 99 }
    await assertSucceeds(setDoc(ref(ana() as never, 'tareas', t.id), aDocumento('tareas', t)))
  })
  test('nadie más lee ni escribe lo tuyo, ni sin sesión', async () => {
    await assertSucceeds(setDoc(ref(ana() as never, 'cursos', 'c1'), { id: 'c1', nombre: 'Cálculo', color: '#fff', actualizadoEn: 1 }))
    await assertFails(getDoc(ref(beto() as never, 'cursos', 'c1')))
    await assertFails(getDoc(ref(anon() as never, 'cursos', 'c1')))
    await assertFails(setDoc(ref(beto() as never, 'cursos', 'c2'), { id: 'c2', nombre: 'X', color: '#fff', actualizadoEn: 1 }))
  })
  test('rechaza campos que no existen, tipos malos, ids que no coinciden y colecciones inventadas', async () => {
    const db = ana() as never
    await assertFails(setDoc(ref(db, 'cursos', 'c1'), { id: 'c1', nombre: 'X', color: '#fff', actualizadoEn: 1, hack: 'x' }))
    await assertFails(setDoc(ref(db, 'cursos', 'c1'), { id: 'otro', nombre: 'X', color: '#fff', actualizadoEn: 1 }))
    await assertFails(setDoc(ref(db, 'cursos', 'c1'), { id: 'c1', nombre: 123, color: '#fff', actualizadoEn: 1 }))
    await assertFails(setDoc(ref(db, 'cursos', 'c1'), { id: 'c1', nombre: 'X', color: '#fff', actualizadoEn: '1' }))
    await assertFails(setDoc(doc(db, 'users', 'ana', 'estudios', 'secretos', 'registros', 'x'), { id: 'x', actualizadoEn: 1 }))
    await assertFails(setDoc(ref(db, 'clases', 'k'), { id: 'k', cursoId: 'c', dia: 9, inicio: '08:00', fin: '09:00', aula: 'A', actualizadoEn: 1 })) // día 9
    await assertFails(setDoc(ref(db, 'apuntes', 'a'), { id: 'a', texto: 'x', fecha: 'mañana', tipo: 'apunte', actualizadoEn: 1 })) // fecha mala
    await assertFails(setDoc(ref(db, 'tareas', 't'), { ...aDocumento('tareas', datos.tareas[0]), id: 't', estado: 'quizas' }))
  })
  test('el perfil solo se guarda en estudios/perfil y con valores razonables', async () => {
    const db = ana() as never
    const p = { inicioCiclo: '2026-08-24', semanasCiclo: 16, enfoqueMin: 25, descansoMin: 5, actualizadoEn: 1 }
    await assertSucceeds(setDoc(doc(db, 'users', 'ana', 'estudios', 'perfil'), p))
    await assertFails(setDoc(doc(db, 'users', 'ana', 'estudios', 'otro'), p))
    await assertFails(setDoc(doc(db, 'users', 'ana', 'estudios', 'perfil'), { ...p, semanasCiclo: 500 }))
  })
  test('las reglas de Finanstia siguen igual', async () => {
    await assertSucceeds(setDoc(doc(ana() as never, 'users', 'ana', 'config', 'main'), { categoriasGasto: ['Almuerzos'] }))
    await assertFails(setDoc(doc(beto() as never, 'users', 'ana', 'config', 'main'), { categoriasGasto: ['x'] }))
  })
})

describe('sincronización entre dos teléfonos', () => {
  const esperar = (cond: () => boolean) => new Promise<void>((ok, mal) => {
    const t0 = Date.now()
    const id = setInterval(() => {
      if (cond()) (clearInterval(id), ok())
      else if (Date.now() - t0 > 8000) (clearInterval(id), mal(new Error('tiempo agotado')))
    }, 25)
  })

  test('lo que sube un teléfono lo recibe el otro, con tareas, recordatorios y perfil', async () => {
    const a = crearSync(ana() as never, 'ana')
    const b = crearSync(ana() as never, 'ana')
    await a.subir(cambiosPendientes(datos, new Map()).registros, { ...datos.perfil, actualizadoEn: 7 })
    const recibido: Record<string, Registro[]> = {}
    let perfil: unknown = 'nada'
    const fuentes = new Set<string>()
    const off = b.suscribir((e: Entrega) => {
      fuentes.add(e.fuente)
      if (e.fuente === 'perfil') perfil = e.perfil
      else recibido[e.fuente] = e.registros
    }, (err) => { throw err })
    await esperar(() => fuentes.size === COLECCIONES.length + 1 && recibido.tareas?.length === datos.tareas.length)
    off()
    expect(recibido.recordatorios[0]).toMatchObject({ id: 'r1', texto: 'Comprar pan' })
    expect(recibido.apuntes).toHaveLength(2)
    expect((perfil as { actualizadoEn: number }).actualizadoEn).toBe(7)
  })

  test('una lápida llega al otro teléfono (lo borrado no resucita)', async () => {
    const a = crearSync(ana() as never, 'ana')
    const t = datos.tareas[0]
    await a.subir([{ col: 'tareas', registro: t }], null)
    await a.subir([{ col: 'tareas', registro: { ...t, borradoEn: 500, actualizadoEn: 500 } }], null)
    let visto: Registro | undefined
    const off = crearSync(ana() as never, 'ana').suscribir((e) => { if (e.fuente === 'tareas') visto = e.registros.find((r) => r.id === t.id) }, () => {})
    await esperar(() => visto?.borradoEn === 500)
    off()
  })

  test('borrar todo limpia estudios y no toca Finanstia', async () => {
    const db = ana() as never
    const a = crearSync(db, 'ana')
    await a.subir(cambiosPendientes(datos, new Map()).registros, datos.perfil)
    await setDoc(doc(db, 'users', 'ana', 'config', 'main'), { categoriasGasto: ['Almuerzos'] })
    await a.borrarTodo()
    for (const col of COLECCIONES) expect((await getDocs(collection(db, 'users', 'ana', 'estudios', col, 'registros'))).size).toBe(0)
    expect((await getDoc(doc(db, 'users', 'ana', 'estudios', 'perfil'))).exists()).toBe(false)
    expect((await getDoc(doc(db, 'users', 'ana', 'config', 'main'))).exists()).toBe(true)
  })
})
