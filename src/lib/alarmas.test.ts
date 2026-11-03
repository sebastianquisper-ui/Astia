import { describe, expect, it } from 'vitest'
import type { Clase, Tarea } from '../dominio/tipos'
import { alarmasPendientes, claseInminente, claveDeAlarma, horaBonita, normalizarHoras, pendientesParaAlarma } from './alarmas'

const AHORA = new Date(2026, 10, 3, 14, 5, 0) // martes 3 nov 2026, 14:05

const clase = (id: string, dia: number, inicio: string): Clase => ({ id, actualizadoEn: 0, cursoId: 'c', dia, inicio, fin: '23:00', aula: 'A1' }) as Clase
const tarea = (id: string, fecha: string, estado: 'pendiente' | 'hecha' = 'pendiente'): Tarea =>
  ({ id, actualizadoEn: 0, titulo: id, area: 'universidad', cursoId: null, tipo: 'tarea', fecha, prioridad: 'media', pideEvidencia: false, pasos: [], estado }) as Tarea

describe('alarmas diarias', () => {
  it('normaliza: quita inválidas y repetidas, y ordena', () => {
    expect(normalizarHoras(['20:00', '8:00', '08:00', '25:00', '08:00', 'x'])).toEqual(['08:00', '20:00'])
    expect(normalizarHoras(undefined)).toEqual([])
  })
  it('toca la de las 14:00 recién pasada, no la de las 20:00 ni la de las 08:00 (ya muy atrás)', () => {
    expect(alarmasPendientes(['08:00', '14:00', '20:00'], AHORA, new Set())).toEqual(['14:00'])
  })
  it('no repite una que ya se mostró', () => {
    expect(alarmasPendientes(['14:00'], AHORA, new Set([claveDeAlarma(AHORA, '14:00')]))).toEqual([])
  })
  it('si abres la app pasado el margen de gracia, la deja pasar', () => {
    expect(alarmasPendientes(['14:00'], new Date(2026, 10, 3, 15, 30), new Set())).toEqual([])
  })
  it('no toca antes de la hora', () => {
    expect(alarmasPendientes(['14:30'], AHORA, new Set())).toEqual([])
  })
  it('muestra la hora en formato legible', () => {
    expect(horaBonita('08:00')).toBe('8:00 a. m.')
    expect(horaBonita('00:30')).toBe('12:30 a. m.')
    expect(horaBonita('14:00')).toBe('2:00 p. m.')
  })
})

describe('aviso antes de la clase', () => {
  // AHORA es martes -> dia 1 (lunes = 0)
  it('avisa cuando falta justo el margen', () => {
    const r = claseInminente([clase('a', 1, '14:15')], AHORA, 10)
    expect(r?.minutos).toBe(10)
    expect(r?.clave).toBe('2026-11-03 clase-a')
  })
  it('no avisa si falta más que el margen', () => {
    expect(claseInminente([clase('a', 1, '14:30')], AHORA, 10)).toBeNull()
  })
  it('apagado (0 min) no avisa nunca', () => {
    expect(claseInminente([clase('a', 1, '14:06')], AHORA, 0)).toBeNull()
  })
  it('ignora una clase de otro día', () => {
    expect(claseInminente([clase('a', 2, '14:10')], AHORA, 10)).toBeNull()
  })
})

describe('pendientes de la alarma', () => {
  it('deja solo las pendientes, la más urgente primero', () => {
    const lista = pendientesParaAlarma([tarea('lejana', '2026-12-01'), tarea('hecha', '2026-11-04', 'hecha'), tarea('pronto', '2026-11-04'), tarea('vencida', '2026-11-01')], AHORA)
    expect(lista.map((t) => t.id)).toEqual(['vencida', 'pronto', 'lejana'])
  })
})
