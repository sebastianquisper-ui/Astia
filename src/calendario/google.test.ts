import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _olvidarToken, _ponerToken, borrarEventoRecordatorio, crearEventoRecordatorio } from './google'

const llamadas: { url: string; init?: RequestInit }[] = []
beforeEach(() => {
  llamadas.length = 0
  _olvidarToken()
})
afterEach(() => vi.unstubAllGlobals())

describe('Google Calendar', () => {
  it('sin permiso no crea ni borra nada', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(crearEventoRecordatorio({ id: 'r1', texto: 'Comprar pan', cuando: new Date(2026, 9, 15, 10, 40) })).rejects.toThrow('Sin permiso')
    expect(await borrarEventoRecordatorio('abc')).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('crea un evento con alarma exacta y la marca de Astia', async () => {
    _ponerToken('tok')
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => (llamadas.push({ url, init }), { ok: true, status: 200, json: async () => ({ id: 'ev1' }) })))
    const id = await crearEventoRecordatorio({ id: 'r1', texto: 'Comprar pan', cuando: new Date(Date.UTC(2026, 9, 15, 15, 40)) })
    expect(id).toBe('ev1')
    const cuerpo = JSON.parse(String(llamadas[0].init?.body))
    expect(cuerpo.summary).toBe('⏰ Comprar pan')
    expect(cuerpo.start.dateTime).toBe('2026-10-15T15:40:00.000Z')
    expect(cuerpo.reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] })
    expect(cuerpo.extendedProperties.private.astia).toBe('r1')
    expect((llamadas[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })
  it('borrar: un evento que ya no existe cuenta como borrado; un error no', async () => {
    _ponerToken('tok')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 410 })))
    expect(await borrarEventoRecordatorio('ev1')).toBe(true)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })))
    expect(await borrarEventoRecordatorio('ev1')).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red') }))
    expect(await borrarEventoRecordatorio('ev1')).toBe(false)
  })
})
