import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ANIMACIONES_ALPI, EXPRESIONES_ALPI, NIVELES_ALPI, PIEZAS_EXPRESION, desdeAnimo, efectoDe, nivelAlpi, seVeEnNivel } from './datos'
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

describe('el modelo 3D de Alpi (alpi.glb)', () => {
  // Lee los nombres de las piezas guardados en el archivo .glb (su parte JSON).
  const nombres = (() => {
    const b = readFileSync('src/assets/alpi/alpi.glb')
    const largo = b.readUInt32LE(12)
    const json = JSON.parse(b.subarray(20, 20 + largo).toString('utf8')) as { nodes: { name?: string }[] }
    return new Set(json.nodes.map((n) => n.name ?? ''))
  })()
  it('trae las piezas que se mueven', () => {
    for (const p of ['Raiz', 'Cuerpo', 'Cabeza', 'BrazoL', 'BrazoR', 'PataL', 'PataR', 'OrejaL', 'OrejaR', 'OjoL', 'OjoR', 'Libro', 'Tronco']) expect(nombres.has(p), p).toBe(true)
  })
  it('trae todas las piezas de cada expresión', () => {
    for (const piezas of Object.values(PIEZAS_EXPRESION)) for (const p of piezas) expect(nombres.has(p), p).toBe(true)
  })
  it('cada nivel tiene sus propios accesorios', () => {
    for (const nivel of [1, 2, 3, 4] as const) {
      const propios = [...nombres].filter((n) => n.startsWith('Niv_') && seVeEnNivel(n, nivel))
      expect(propios.length, `nivel ${nivel}`).toBeGreaterThan(1)
    }
    expect(seVeEnNivel('Niv_234_mochila', 1)).toBe(false)
    expect(seVeEnNivel('Niv_234_mochila', 3)).toBe(true)
    expect(seVeEnNivel('Cabeza', 2)).toBe(true)
  })
})
