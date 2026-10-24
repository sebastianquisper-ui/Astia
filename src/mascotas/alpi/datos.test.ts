import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { desdeAnimo, nivelAlpi } from './datos'

describe('Alpi', () => {
  it('el ánimo de la app se traduce a su expresión', () => {
    expect(desdeAnimo('seria')).toEqual({ expresion: 'normal' })
    expect(desdeAnimo('alerta').expresion).toBe('reganona')
    expect(desdeAnimo('durmiendo').expresion).toBe('dormida')
    expect(desdeAnimo('contenta')).toEqual({ expresion: 'feliz', accion: 'saludar' })
    expect(desdeAnimo('seria', { fiesta: true })).toEqual({ expresion: 'orgullosa', accion: 'bailar' })
  })
  it('el nivel se limita de 1 a 4', () => {
    expect(nivelAlpi(0)).toBe(1)
    expect(nivelAlpi(9)).toBe(4)
  })
  it('el modelo entiende todas las expresiones y acciones que la app le manda', () => {
    const html = readFileSync('src/mascotas/alpi/modelo/alpi-3d.html', 'utf8')
    for (const e of ['normal', 'feliz', 'dormida', 'reganona', 'orgullosa']) expect(html).toContain(`data-e="${e}"`)
    for (const a of ['saludar', 'bailar']) expect(html).toContain(`data-a="${a}"`)
    expect(html).toContain('window.Alpi=API')
    expect(html).toContain("<script src=\"https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js\"></script>")
  })
})
