import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configurarVoz, hablar, probarVoz, vocesEspanol } from './voz'

const voces = [
  { voiceURI: 'en', lang: 'en-US', name: 'Sam' },
  { voiceURI: 'mx', lang: 'es-MX', name: 'Paulina' },
  { voiceURI: 'es', lang: 'es-ES', name: 'Monica' },
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
  it('solo ofrece voces en español', () => expect(vocesEspanol().map((v) => v.voiceURI)).toEqual(['mx', 'es']))
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
})
