import { beforeEach, describe, expect, it } from 'vitest'
import { leerSesiones, registrarSesion } from './sesiones'

beforeEach(() => localStorage.clear())

describe('registro de sesiones', () => {
  it('anota hora, método y si se completó, la más nueva primero', () => {
    registrarSesion({ inicio: '2026-10-26T15:00:00Z', metodo: 'pomodoro', enfoqueMin: 25, completa: true })
    registrarSesion({ inicio: '2026-10-26T20:00:00Z', metodo: 'feynman', enfoqueMin: 10, completa: false })
    expect(leerSesiones().map((s) => s.metodo)).toEqual(['feynman', 'pomodoro'])
  })
  it('no anota sesiones sin minutos de enfoque', () => {
    expect(registrarSesion({ inicio: '2026-10-26T15:00:00Z', metodo: 'pomodoro', enfoqueMin: 0, completa: false })).toBe(false)
    expect(leerSesiones()).toEqual([])
  })
  it('guarda solo las últimas 300', () => {
    for (let i = 0; i < 305; i++) registrarSesion({ inicio: new Date(i * 1000).toISOString(), metodo: 'pomodoro', enfoqueMin: 5, completa: true })
    expect(leerSesiones()).toHaveLength(300)
  })
})
