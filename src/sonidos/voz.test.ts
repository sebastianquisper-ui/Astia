import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configurarVoz, hablar, hayVozDelGenero, probarVoz, vocesEspanol } from './voz'

const voces = [
  { voiceURI: 'en', lang: 'en-US', name: 'Sam' },
  { voiceURI: 'mx', lang: 'es-MX', name: 'Paulina' },
  { voiceURI: 'es', lang: 'es-ES', name: 'Monica' },
  { voiceURI: 'jorge', lang: 'es-ES', name: 'Jorge' },
]
const dicho: { texto: string; voz?: string }[] = []

beforeEach(() => {
  dicho.length = 0
  vi.stubGlobal('SpeechSynthesisUtterance', class { voice?: { voiceURI: string }; lang = ''; rate = 1; constructor(public text: string) {} })
  vi.stubGlobal('speechSynthesis', { getVoices: () => voces, cancel: vi.fn(), speak: (u: { text: string; voice?: { voiceURI: string } }) => dicho.push({ texto: u.text, voz: u.voice?.voiceURI }) })
  Object.defineProperty(window, 'speechSynthesis', { value: globalThis.speechSynthesis, configurable: true })
  configurarVoz(undefined)
})
afterEach(() => vi.unstubAllGlobals())

describe('voz de Alpi', () => {
  it('detecta si hay voz del género pedido', () => {
    expect(hayVozDelGenero(vocesEspanol(), 'hombre')).toBe(true)
    expect(hayVozDelGenero(vocesEspanol().slice(0, 2), 'hombre')).toBe(false)
  })
  it('solo ofrece voces en español', () => expect(vocesEspanol().map((v) => v.voiceURI)).toEqual(['mx', 'es', 'jorge']))
  it('no habla si no está activa', () => {
    hablar('Guardado')
    expect(dicho).toEqual([])
  })
  it('habla con la voz elegida o la primera en español', () => {
    configurarVoz({ activa: true })
    hablar('Guardado')
    configurarVoz({ activa: true, voz: 'es' })
    hablar('Listo')
    expect(dicho).toEqual([{ texto: 'Guardado', voz: 'mx' }, { texto: 'Listo', voz: 'es' }])
  })
  it('probar suena aunque esté apagada, y no lee textos vacíos', () => {
    probarVoz()
    configurarVoz({ activa: true })
    hablar('  ')
    expect(dicho).toHaveLength(1)
  })
  it('sin elegir, la voz sigue al género de la mascota', () => {
    configurarVoz({ activa: true }, 'hombre')
    hablar('Hola')
    configurarVoz({ activa: true }, 'mujer')
    hablar('Hola')
    expect(dicho.map((d) => d.voz)).toEqual(['jorge', 'mx'])
  })
  it('lo elegido en Sonidos manda sobre la mascota', () => {
    configurarVoz({ activa: true, genero: 'mujer' }, 'hombre')
    hablar('Hola')
    expect(dicho[0].voz).toBe('mx')
  })
})
