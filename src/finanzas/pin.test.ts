// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { INTENTOS_LIBRES, crearRegistroPin, esperaTrasFallos, pinValido, verificarPin } from './pin'

beforeEach(() => {
  // en Node no hay localStorage: el guardado de intentos falla en silencio y no se prueba aquí
})

describe('PIN de Finanstia', () => {
  it('acepta de 4 a 6 números y nada más', () => {
    expect(pinValido('1234')).toBe(true)
    expect(pinValido('123456')).toBe(true)
    expect(pinValido('123')).toBe(false)
    expect(pinValido('1234567')).toBe(false)
    expect(pinValido('12a4')).toBe(false)
    expect(pinValido('')).toBe(false)
  })
  it('no guarda el número: solo una huella con sal', async () => {
    const r = await crearRegistroPin('4821')
    expect(JSON.stringify(r)).not.toContain('4821')
    expect(r.sal.length).toBeGreaterThan(10)
    expect(r.huella.length).toBeGreaterThan(20)
  })
  it('verifica el PIN correcto y rechaza los demás', async () => {
    const r = await crearRegistroPin('4821')
    expect(await verificarPin('4821', r)).toBe(true)
    expect(await verificarPin('4822', r)).toBe(false)
    expect(await verificarPin('482', r)).toBe(false)
    expect(await verificarPin('abcd', r)).toBe(false)
  })
  it('el mismo PIN da huellas distintas (cada uno tiene su sal)', async () => {
    const a = await crearRegistroPin('1111')
    const b = await crearRegistroPin('1111')
    expect(a.huella).not.toBe(b.huella)
    expect(await verificarPin('1111', b)).toBe(true)
  })
  it('crear un PIN inválido falla con un mensaje claro', async () => {
    await expect(crearRegistroPin('12')).rejects.toThrow('4 a 6 números')
  })
  it('después de 5 errores se espera, y cada vez más (hasta 15 minutos)', () => {
    expect(esperaTrasFallos(INTENTOS_LIBRES - 1)).toBe(0)
    expect(esperaTrasFallos(INTENTOS_LIBRES)).toBe(30)
    expect(esperaTrasFallos(INTENTOS_LIBRES + 1)).toBe(60)
    expect(esperaTrasFallos(INTENTOS_LIBRES + 2)).toBe(120)
    expect(esperaTrasFallos(50)).toBe(15 * 60)
  })
})
