import { describe, expect, it } from 'vitest'
import { segundosParaDescansar } from './descansoVista'

describe('regla 20-20-20', () => {
  it('toca descansar a los 20 minutos de uso', () => {
    expect(segundosParaDescansar(0)).toBe(1200)
    expect(segundosParaDescansar(1199)).toBe(1)
    expect(segundosParaDescansar(1200)).toBe(0)
  })
})
