import { describe, expect, it } from 'vitest'
import { ANIMACIONES_ALPI, EXPRESIONES_ALPI, NIVELES_ALPI, desdeAnimo, efectoDe, nivelAlpi } from './datos'
import { mascotaPorId } from '../../lib/mascotas'

describe('Alpi', () => {
  it('tiene 4 niveles con los mismos nombres que su evolución', () => {
    expect(NIVELES_ALPI.map((n) => n.nombre)).toEqual(mascotaPorId('alpi')!.etapas)
  })
  it('8 expresiones y 7 animaciones', () => {
    expect(EXPRESIONES_ALPI.map((e) => e.id)).toEqual(['feliz', 'emocionada', 'curiosa', 'dormida', 'concentrada', 'sorprendida', 'triste', 'guino'])
    expect(ANIMACIONES_ALPI.map((a) => a.id)).toEqual(['reposo', 'caminar', 'saltar', 'celebrar', 'estudiando', 'descansando', 'saludar'])
  })
  it('el ánimo de la app se traduce a su expresión y movimiento', () => {
    expect(desdeAnimo('durmiendo')).toEqual({ expresion: 'dormida', animacion: 'descansando' })
    expect(desdeAnimo('alerta').expresion).toBe('sorprendida')
    expect(desdeAnimo('contenta')).toEqual({ expresion: 'feliz', animacion: 'saludar' })
    expect(desdeAnimo('seria', { tocada: true })).toEqual({ expresion: 'emocionada', animacion: 'saltar' })
    expect(desdeAnimo('seria', { fiesta: true }).animacion).toBe('celebrar')
  })
  it('efectos: zzz al dormir, chispas al celebrar', () => {
    expect(efectoDe('feliz', 'descansando')).toBe('zzz')
    expect(efectoDe('feliz', 'celebrar')).toBe('chispas')
    expect(efectoDe('curiosa', 'reposo')).toBe('pregunta')
    expect(efectoDe('feliz', 'reposo')).toBeNull()
  })
  it('el nivel se limita de 1 a 4', () => {
    expect(nivelAlpi(0)).toBe(1)
    expect(nivelAlpi(9)).toBe(4)
  })
})
