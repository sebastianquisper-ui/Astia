import { describe, expect, it } from 'vitest'
import { interpretarConReglas, norm, palabrasANumeros, type Contexto, type Interpretacion } from './dictado'
import { normalizarConfig } from './modelo'
import type { Meta } from './tipos'

const metas: Meta[] = [
  { id: 'm1', nombre: 'Laptop nueva', objetivo: 3200, aportes: [] },
  { id: 'm2', nombre: 'Viaje a Cusco', objetivo: 800, aportes: [] },
]
// 2026-10-25 es domingo
const ctx = (extra: Partial<Contexto> = {}): Contexto => ({ config: normalizarConfig(), metas, hoy: '2026-10-25', medioPorDefecto: 'digital', ...extra })
const dice = async (frase: string, c = ctx()) => (await interpretarConReglas(frase, c)) as Interpretacion & Record<string, unknown>

describe('números en palabras', () => {
  const casos: [string, string][] = [
    ['quince soles', '15 soles'],
    ['treinta y cinco soles', '35 soles'],
    ['veintidos soles', '22 soles'],
    ['cien soles', '100 soles'],
    ['ciento veinte soles', '120 soles'],
    ['doscientos cincuenta', '250'],
    ['mil doscientos soles', '1200 soles'],
    ['dos mil quinientos', '2500'],
    ['un sol', '1 sol'],
    ['compre una laptop', 'compre una laptop'], // "una" suelto es un artículo
    ['gaste 15 soles', 'gaste 15 soles'],
  ]
  for (const [entrada, salida] of casos) it(`"${entrada}" → "${salida}"`, () => expect(palabrasANumeros(norm(entrada))).toBe(salida))
})

describe('dictar un gasto', () => {
  it('gasté 15 soles en almuerzo', async () => {
    expect(await dice('Gasté 15 soles en almuerzo')).toMatchObject({ tipo: 'gasto', monto: 15, categoria: 'Almuerzos', medio: 'digital', fecha: '2026-10-25', dudas: [] })
  })
  it('entiende el monto en palabras', async () => {
    expect(await dice('pagué quince soles de pasaje')).toMatchObject({ tipo: 'gasto', monto: 15, categoria: 'Pasajes' })
    expect(await dice('compré un cable por treinta y cinco soles')).toMatchObject({ tipo: 'gasto', monto: 35, categoria: 'Tecnología' })
  })
  it('decimales: 20 con 50, 15,50 y 15 soles y 50 céntimos', async () => {
    expect((await dice('gasté 20 con 50 en taxi')).monto).toBe(20.5)
    expect((await dice('gasté 15,50 soles en menú')).monto).toBe(15.5)
    expect((await dice('gasté 15 soles y 50 céntimos en almuerzo')).monto).toBe(15.5)
    expect((await dice('gasté veinte soles con cincuenta en almuerzo')).monto).toBe(20.5)
  })
  it('miles con separador', async () => {
    expect((await dice('compré una laptop por 1,200 soles')).monto).toBe(1200)
    expect((await dice('compré una laptop por mil doscientos soles')).monto).toBe(1200)
  })
  it('elige el número que va con "soles", no el de la cantidad', async () => {
    expect((await dice('compré 3 galletas por 6 soles')).monto).toBe(6)
  })
  it('billetera: efectivo, yape, o la que estás viendo si no dices', async () => {
    expect((await dice('gasté 8 soles en pasaje en efectivo')).medio).toBe('efectivo')
    expect((await dice('pagué 8 soles de almuerzo con yape')).medio).toBe('digital')
    expect((await dice('gasté 8 soles en almuerzo', ctx({ medioPorDefecto: 'efectivo' }))).medio).toBe('efectivo')
  })
  it('fecha: ayer, anteayer, hace 3 días, el lunes', async () => {
    expect((await dice('ayer gasté 10 soles en almuerzo')).fecha).toBe('2026-10-24')
    expect((await dice('anteayer pagué 10 soles de taxi')).fecha).toBe('2026-10-23')
    expect((await dice('hace 3 días compré un cable por 10 soles')).fecha).toBe('2026-10-22')
    expect((await dice('el lunes gasté 10 soles en almuerzo')).fecha).toBe('2026-10-19')
    expect((await dice('el domingo gasté 10 soles en almuerzo')).fecha).toBe('2026-10-18') // hoy es domingo: el pasado
  })
  it('la nota: "con Ana" y "nota ..."', async () => {
    expect((await dice('gasté 16 soles en almuerzo con Ana')).nota).toBe('con Ana')
    expect((await dice('gasté 16 soles en almuerzo nota menú del día')).nota).toBe('menú del día')
  })
  it('si no encuentra la categoría lo dice y no adivina', async () => {
    const r = await dice('gasté 40 soles en algo raro')
    expect(r).toMatchObject({ tipo: 'gasto', monto: 40, categoria: null })
    expect((r.dudas as string[]).join(' ')).toContain('categoría')
  })
  it('una categoría que tú creaste se reconoce por su nombre', async () => {
    const c = ctx({ config: normalizarConfig({ categoriasGasto: ['Almuerzos', 'Mascota'] }) })
    expect(await dice('compré comida para la mascota 25 soles', c)).toMatchObject({ categoria: 'Mascota' })
  })
  it('"categoría X" crea una categoría nueva si no existe', async () => {
    expect(await dice('gasté 30 soles categoría gimnasio', ctx())).toMatchObject({ categoria: 'Gimnasio', categoriaNueva: true })
  })
  it('sin verbo claro, avisa que supuso gasto', async () => {
    const r = await dice('15 soles almuerzo')
    expect(r).toMatchObject({ tipo: 'gasto', monto: 15, categoria: 'Almuerzos' })
    expect((r.dudas as string[]).join(' ')).toContain('gasto')
  })
})

describe('dictar un ingreso', () => {
  it('me llegó un ingreso de 200 por sueldo', async () => {
    expect(await dice('Me llegó un ingreso de 200 soles por sueldo')).toMatchObject({ tipo: 'ingreso', monto: 200, categoria: 'Sueldo', dudas: [] })
  })
  it('cobré, recibí, me pagaron, vendí', async () => {
    expect(await dice('cobré mi sueldo 1500 soles')).toMatchObject({ tipo: 'ingreso', monto: 1500, categoria: 'Sueldo' })
    expect(await dice('me dieron una propina de 20 soles')).toMatchObject({ tipo: 'ingreso', monto: 20, categoria: 'Propina' })
    expect(await dice('vendí un libro en 40 soles')).toMatchObject({ tipo: 'ingreso', monto: 40, categoria: 'Venta' })
    expect(await dice('me regalaron 50 soles en efectivo')).toMatchObject({ tipo: 'ingreso', monto: 50, categoria: 'Regalo', medio: 'efectivo' })
  })
  it('"me cobraron" es un gasto', async () => {
    expect(await dice('me cobraron 12 soles de taxi')).toMatchObject({ tipo: 'gasto', monto: 12 })
  })
})

describe('dictar una transferencia', () => {
  it('de digital a efectivo, y al revés', async () => {
    expect(await dice('pasé 50 soles de digital a efectivo')).toMatchObject({ tipo: 'transferencia', monto: 50, origen: 'digital', destino: 'efectivo' })
    expect(await dice('pasé cien soles de efectivo a digital')).toMatchObject({ tipo: 'transferencia', monto: 100, origen: 'efectivo', destino: 'digital' })
  })
  it('saqué plata del cajero y deposité en el banco', async () => {
    expect(await dice('saqué 100 soles del cajero')).toMatchObject({ tipo: 'transferencia', origen: 'digital', destino: 'efectivo' })
    expect(await dice('deposité 80 soles en el banco')).toMatchObject({ tipo: 'transferencia', origen: 'efectivo', destino: 'digital' })
  })
})

describe('dictar un aporte a una meta', () => {
  it('aporté 100 a mi laptop', async () => {
    const r = await dice('aporté 100 soles a mi laptop')
    expect(r).toMatchObject({ tipo: 'aporte', monto: 100 })
    expect((r.meta as Meta).id).toBe('m1')
  })
  it('ahorré para el viaje', async () => {
    const r = await dice('ahorré 50 soles para el viaje a Cusco')
    expect(r).toMatchObject({ tipo: 'aporte', monto: 50 })
    expect((r.meta as Meta).id).toBe('m2')
  })
  it('si hay varias metas y no dices cuál, pregunta', async () => {
    const r = await dice('aporté 30 soles a mi meta')
    expect(r).toMatchObject({ tipo: 'aporte', meta: null })
    expect((r.dudas as string[]).join(' ')).toContain('meta')
  })
  it('con una sola meta, no hace falta nombrarla', async () => {
    const r = await dice('aporté 30 soles', ctx({ metas: [metas[0]] }))
    expect((r.meta as Meta).id).toBe('m1')
  })
  it('retirar de una meta', async () => {
    expect(await dice('retiré 20 soles de mi meta de la laptop')).toMatchObject({ tipo: 'retiro', monto: 20 })
  })
})

describe('lo que no entiende', () => {
  it('una frase vacía o sin monto no se guarda', async () => {
    expect(await dice('')).toMatchObject({ tipo: 'nada' })
    expect(await dice('hola Alpi cómo estás')).toMatchObject({ tipo: 'nada' })
    expect((await dice('hola')).motivo).toContain('monto')
  })
  it('las tildes y mayúsculas no importan', async () => {
    expect(await dice('GASTÉ 15 SOLES EN ALMUERZO')).toMatchObject({ tipo: 'gasto', monto: 15, categoria: 'Almuerzos' })
  })
})
