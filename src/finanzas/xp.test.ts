import { describe, expect, it } from 'vitest'
import { estadoDinero, expresionFinanzas, fraseFinanzas } from './estado'
import { normalizarConfig } from './modelo'
import type { Config, Meta, Movimiento } from './tipos'
import { PUNTOS_FINANZAS, UMBRALES_FINANZAS, calcularXPFinanzas, estadoAlpiFinanzas, totalXPFinanzas } from './xp'

let n = 0
const mov = (extra: Partial<Movimiento> = {}): Movimiento => ({ id: 'm' + n++, tipo: 'gasto', categoria: 'Almuerzos', monto: 10, fecha: '2026-10-10', medio: 'digital', ...extra })
const hoy = '2026-10-25'
const vacio = { movs: [], metas: [], config: normalizarConfig(), hoy }

describe('experiencia del Alpi de Finanstia', () => {
  it('sin nada anotado es 0', () => expect(totalXPFinanzas(calcularXPFinanzas(vacio))).toBe(0))
  it('suma por día anotado, no por cada movimiento (no se puede inflar)', () => {
    const xp = calcularXPFinanzas({ ...vacio, movs: [mov(), mov(), mov(), mov({ fecha: '2026-10-11' })] })
    expect(xp.constancia).toBe(2 * PUNTOS_FINANZAS.diaRegistrado)
  })
  it('gastar no da más puntos que ingresar: cuenta el día, no el monto', () => {
    const poco = calcularXPFinanzas({ ...vacio, movs: [mov({ monto: 1 })] })
    const mucho = calcularXPFinanzas({ ...vacio, movs: [mov({ monto: 5000 })] })
    expect(totalXPFinanzas(poco)).toBe(totalXPFinanzas(mucho))
  })
  it('las transferencias y los días futuros no cuentan', () => {
    const xp = calcularXPFinanzas({ ...vacio, movs: [mov({ transferId: 't1' }), mov({ fecha: '2026-11-30' })] })
    expect(totalXPFinanzas(xp)).toBe(0)
  })
  it('aportar a una meta suma, y retirar no; cumplirla da un bono', () => {
    const meta: Meta = { id: 'g', nombre: 'Viaje', objetivo: 100, aportes: [{ id: 'a', monto: 60, fecha: '2026-10-01' }, { id: 'b', monto: 40, fecha: '2026-10-02' }, { id: 'c', monto: -10, fecha: '2026-10-03' }] }
    const xp = calcularXPFinanzas({ ...vacio, metas: [meta] })
    expect(xp.ahorro).toBe(2 * PUNTOS_FINANZAS.aporte)
    expect(xp.metas).toBe(0) // con el retiro quedó en 90
    const cumplida = calcularXPFinanzas({ ...vacio, metas: [{ ...meta, aportes: meta.aportes.slice(0, 2) }] })
    expect(cumplida.metas).toBe(PUNTOS_FINANZAS.metaCumplida)
  })
  it('un mes cerrado con más ingresos que gastos da puntos; el mes en curso no', () => {
    const cerrado = [mov({ tipo: 'ingreso', categoria: 'Sueldo', monto: 500, fecha: '2026-09-01' }), mov({ monto: 100, fecha: '2026-09-02' })]
    expect(calcularXPFinanzas({ ...vacio, movs: cerrado }).meses).toBe(PUNTOS_FINANZAS.mesEquilibrado)
    const enCurso = [mov({ tipo: 'ingreso', categoria: 'Sueldo', monto: 500, fecha: '2026-10-01' })]
    expect(calcularXPFinanzas({ ...vacio, movs: enCurso }).meses).toBe(0)
    const enPerdida = [mov({ monto: 100, fecha: '2026-09-02' })]
    expect(calcularXPFinanzas({ ...vacio, movs: enPerdida }).meses).toBe(0)
  })
  it('un mes cerrado sin pasarte de ningún tope da puntos, y pasarte los quita', () => {
    const config: Config = normalizarConfig({ presupuestos: { digital: { Almuerzos: 100 }, efectivo: {} } })
    expect(calcularXPFinanzas({ ...vacio, config, movs: [mov({ monto: 80, fecha: '2026-09-02' })] }).meses).toBe(PUNTOS_FINANZAS.mesEnPresupuesto)
    expect(calcularXPFinanzas({ ...vacio, config, movs: [mov({ monto: 130, fecha: '2026-09-02' })] }).meses).toBe(0)
    expect(calcularXPFinanzas({ ...vacio, movs: [mov({ monto: 80, fecha: '2026-09-02' })] }).meses).toBe(0) // sin topes definidos no hay presupuesto que cumplir
  })
  it('los niveles llegan a 50, 200 y 500', () => {
    expect(UMBRALES_FINANZAS).toEqual([0, 50, 200, 500])
    expect(estadoAlpiFinanzas(0)).toMatchObject({ nivel: 1, xpSiguiente: 50, progreso: 0 })
    expect(estadoAlpiFinanzas(49).nivel).toBe(1)
    expect(estadoAlpiFinanzas(50).nivel).toBe(2)
    expect(estadoAlpiFinanzas(200).nivel).toBe(3)
    expect(estadoAlpiFinanzas(500)).toMatchObject({ nivel: 4, xpSiguiente: null, progreso: 1 })
    expect(estadoAlpiFinanzas(125).progreso).toBeCloseTo(0.5)
  })
})

describe('cómo está tu plata (verde, ámbar, rojo)', () => {
  const config = (digital: number, efectivo = 0, topes: Record<string, number> = {}): Config => ({ ...normalizarConfig({ presupuestos: { digital: topes, efectivo: {} } }), saldosCent: { digital, efectivo } })
  it('sin nada es neutro', () => expect(estadoDinero({ config: config(0), movsMes: [] }).estado).toBe('neutro'))
  it('saldo positivo y mes en orden es verde', () => {
    const info = estadoDinero({ config: config(10000), movsMes: [mov({ tipo: 'ingreso', categoria: 'Sueldo', monto: 200 }), mov({ monto: 50 })] })
    expect(info.estado).toBe('verde')
    expect(expresionFinanzas('verde')).toBe('feliz')
  })
  it('saldo negativo es rojo', () => {
    expect(estadoDinero({ config: config(-500), movsMes: [mov()] }).estado).toBe('rojo')
    expect(expresionFinanzas('rojo')).toBe('triste')
  })
  it('un tope pasado es rojo aunque haya saldo', () => {
    const info = estadoDinero({ config: config(100000, 0, { Almuerzos: 20 }), movsMes: [mov({ monto: 25 })] })
    expect(info.estado).toBe('rojo')
    expect(info.excedidas).toEqual(['Almuerzos'])
  })
  it('cerca del tope (70 %) o gastar más de lo que ingresa en el mes es ámbar', () => {
    expect(estadoDinero({ config: config(100000, 0, { Almuerzos: 20 }), movsMes: [mov({ monto: 15 })] }).estado).toBe('ambar')
    expect(estadoDinero({ config: config(100000), movsMes: [mov({ monto: 15 })] }).estado).toBe('ambar') // el mes va en pérdida
  })
  it('las frases mencionan lo que pasa', () => {
    const rojo = estadoDinero({ config: config(100000, 0, { Almuerzos: 20 }), movsMes: [mov({ monto: 25 })] })
    expect(fraseFinanzas(rojo, 0)).toContain('Almuerzos')
    expect(fraseFinanzas(estadoDinero({ config: config(0), movsMes: [] }), 0)).toContain('primer gasto')
  })
})
