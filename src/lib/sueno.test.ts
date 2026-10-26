import { describe, expect, it } from 'vitest'
import { durmiendoAhora, horasEntre, mensajeDeSueno, nivelDeSueno, olvidado, promedio7, textoDuracion, ultimaNoche, type RegistroSueno } from './sueno'

const AHORA = new Date('2026-10-26T12:00:00Z')
const noche = (dormirHaceH: number, horas: number, id = String(dormirHaceH)): RegistroSueno => {
  const durmio = new Date(AHORA.getTime() - dormirHaceH * 36e5)
  return { id, durmio: durmio.toISOString(), desperto: new Date(durmio.getTime() + horas * 36e5).toISOString() }
}

describe('sueño', () => {
  it('formatea la duración', () => {
    expect(textoDuracion(7)).toBe('7 h')
    expect(textoDuracion(5.5)).toBe('5 h 30 min')
    expect(textoDuracion(0.5)).toBe('30 min')
  })
  it('calcula las horas entre dos momentos', () => expect(horasEntre('2026-10-26T00:00:00Z', '2026-10-26T07:30:00Z')).toBe(7.5))

  it('clasifica y dice qué hacer', () => {
    expect([4, 6, 8, 11].map(nivelDeSueno)).toEqual(['muyPoco', 'poco', 'bien', 'mucho'])
    expect(mensajeDeSueno(4, 'Ana')).toContain('Ana, dormiste 4 h: muy poco')
    expect(mensajeDeSueno(8)).toContain('día productivo')
  })

  it('la última noche es la más reciente, y ya no vale pasadas 20 h', () => {
    expect(ultimaNoche([noche(10, 6), noche(34, 8)], AHORA)).toBe(6)
    expect(ultimaNoche([noche(40, 8)], AHORA)).toBeNull()
  })
  it('una siesta no cuenta como la noche', () => expect(ultimaNoche([noche(5, 1)], AHORA)).toBeNull())

  it('el promedio pide al menos 3 noches', () => {
    expect(promedio7([noche(10, 6), noche(34, 8)], AHORA)).toBeNull()
    expect(promedio7([noche(10, 6), noche(34, 8), noche(58, 7)], AHORA)).toBe(7)
  })

  it('detecta si sigues durmiendo o si olvidaste despertar', () => {
    const abierto = (horas: number): RegistroSueno => ({ id: 'a', durmio: new Date(AHORA.getTime() - horas * 36e5).toISOString() })
    expect(durmiendoAhora([abierto(6)], AHORA)?.id).toBe('a')
    expect(olvidado([abierto(6)], AHORA)).toBeNull()
    expect(durmiendoAhora([abierto(20)], AHORA)).toBeNull()
    expect(olvidado([abierto(20)], AHORA)?.id).toBe('a')
  })
})
