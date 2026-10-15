import { describe, expect, it, beforeEach } from 'vitest'
import { temaEfectivo, ESCALA_LETRA } from './tema'
import { leerRuta, hashDe } from './ruta'
import { saludoDe } from './saludo'
import { leerLocal, guardarLocal } from './almacen'

describe('temaEfectivo', () => {
  it('claro y oscuro fijos ignoran la hora', () => {
    expect(temaEfectivo('claro', new Date(2026, 0, 1, 23, 0))).toBe('light')
    expect(temaEfectivo('oscuro', new Date(2026, 0, 1, 12, 0))).toBe('dark')
  })
  it('"hora" es claro de día y oscuro de noche', () => {
    expect(temaEfectivo('hora', new Date(2026, 0, 1, 6, 29))).toBe('dark')
    expect(temaEfectivo('hora', new Date(2026, 0, 1, 6, 30))).toBe('light')
    expect(temaEfectivo('hora', new Date(2026, 0, 1, 18, 29))).toBe('light')
    expect(temaEfectivo('hora', new Date(2026, 0, 1, 18, 30))).toBe('dark')
  })
  it('las escalas de letra crecen', () => {
    expect(ESCALA_LETRA.normal).toBeLessThan(ESCALA_LETRA.grande)
    expect(ESCALA_LETRA.grande).toBeLessThan(ESCALA_LETRA['muy-grande'])
  })
})

describe('rutas', () => {
  it('vacío o desconocido va a Hoy', () => {
    expect(leerRuta('')).toEqual({ pestana: 'hoy', sub: '' })
    expect(leerRuta('#/nada')).toEqual({ pestana: 'hoy', sub: '' })
  })
  it('lee pestaña y sub-pantalla de Más', () => {
    expect(leerRuta('#/tareas')).toEqual({ pestana: 'tareas', sub: '' })
    expect(leerRuta('#/mas/ajustes')).toEqual({ pestana: 'mas', sub: 'ajustes' })
  })
  it('ignora sub-pantallas fuera de Más', () => {
    expect(leerRuta('#/hoy/ajustes').sub).toBe('')
  })
  it('hashDe es el inverso de leerRuta', () => {
    const r = { pestana: 'mas', sub: 'horario' } as const
    expect(leerRuta(hashDe(r))).toEqual(r)
  })
})

describe('saludo', () => {
  it('cambia según la hora', () => {
    expect(saludoDe(8)).toBe('Buenos días')
    expect(saludoDe(15)).toBe('Buenas tardes')
    expect(saludoDe(21)).toBe('Buenas noches')
  })
})

describe('almacen local', () => {
  beforeEach(() => localStorage.clear())
  it('guarda y lee', () => {
    expect(guardarLocal('x', { a: 1 })).toBe(true)
    expect(leerLocal('x', null)).toEqual({ a: 1 })
  })
  it('devuelve el valor por defecto si no existe o está dañado', () => {
    expect(leerLocal('no-existe', 7)).toBe(7)
    localStorage.setItem('roto', '{no es json')
    expect(leerLocal('roto', 'ok')).toBe('ok')
  })
})
