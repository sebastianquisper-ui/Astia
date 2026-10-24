import { describe, expect, it } from 'vitest'
import type { Tarea } from '../../dominio/tipos'
import { diasDeAtraso } from '../../lib/urgencia'
import { expresionPorProgreso, type ProgresoAlpi } from './datos'

const p = (o: Partial<ProgresoAlpi> = {}): ProgresoAlpi => ({ vencidas: 0, diasAtraso: 0, porHacer: 0, hechas: 0, ...o })

describe('expresión de Alpi según tu avance', () => {
  it('de noche duerme, pase lo que pase', () => {
    expect(expresionPorProgreso('durmiendo', p({ vencidas: 5, diasAtraso: 9 })).expresion).toBe('dormida')
  })
  it('un atraso corto la hace regañar, y mientras más lo ignoras más se enoja', () => {
    expect(expresionPorProgreso('alerta', p({ vencidas: 1, diasAtraso: 1 })).expresion).toBe('reganona')
    expect(expresionPorProgreso('alerta', p({ vencidas: 1, diasAtraso: 2 })).expresion).toBe('molesta')
    expect(expresionPorProgreso('alerta', p({ vencidas: 2, diasAtraso: 1 })).expresion).toBe('molesta')
    expect(expresionPorProgreso('alerta', p({ vencidas: 1, diasAtraso: 4 })).expresion).toBe('furiosa')
    expect(expresionPorProgreso('alerta', p({ vencidas: 4, diasAtraso: 1 })).expresion).toBe('furiosa')
  })
  it('con todo cumplido y a tiempo está orgullosa', () => {
    expect(expresionPorProgreso('contenta', p({ hechas: 3 })).expresion).toBe('orgullosa')
  })
  it('mientras avanzas está feliz, y si no has empezado, concentrada', () => {
    expect(expresionPorProgreso('seria', p({ hechas: 1, porHacer: 2 })).expresion).toBe('feliz')
    expect(expresionPorProgreso('seria', p({ porHacer: 2 })).expresion).toBe('concentrada')
    expect(expresionPorProgreso('seria', p()).expresion).toBe('normal')
  })
  it('cuando recién cumples algo, baila', () => {
    expect(expresionPorProgreso('contenta', p({ hechas: 1, porHacer: 1 }), { baila: true })).toEqual({ expresion: 'feliz', accion: 'bailar' })
  })
  it('atrasada no baila ni de broma si es de noche, pero sí baila de día aunque debas algo', () => {
    expect(expresionPorProgreso('durmiendo', p(), { baila: true }).accion).toBeUndefined()
  })
})

describe('días de atraso', () => {
  const t = (fecha: string, estado: Tarea['estado'] = 'pendiente'): Tarea => ({ id: fecha, actualizadoEn: 0, titulo: 'x', area: 'universidad', cursoId: null, tipo: 'tarea', fecha, prioridad: 'media', pideEvidencia: true, pasos: [], estado })
  const ahora = new Date(2026, 9, 15, 10, 30)
  it('cuenta desde la tarea vencida más antigua', () => {
    expect(diasDeAtraso([t('2026-10-14'), t('2026-10-10')], ahora)).toBe(5)
  })
  it('sin nada vencido, 0 (las hechas y las de hoy no cuentan)', () => {
    expect(diasDeAtraso([t('2026-10-10', 'hecha'), t('2026-10-16')], ahora)).toBe(0)
  })
})
