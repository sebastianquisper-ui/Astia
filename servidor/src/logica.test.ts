// @vitest-environment node
import { buildPushPayload } from '@block65/webcrypto-web-push'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { aplicarAgenda, idDe, quitarSuscripcion, sacarVencidos, validarAvisos, validarSuscripcion, type Estado, type Suscripcion } from './logica'

const sub: Suscripcion = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } }
const aviso = (id: string, cuando: number) => ({ id, cuando, titulo: 'Tarea', cuerpo: 'Entrega' })

describe('validación', () => {
  it('acepta una suscripción completa y rechaza las que no son https o no traen llaves', () => {
    expect(validarSuscripcion(sub)).toEqual(sub)
    expect(validarSuscripcion({ ...sub, endpoint: 'http://x.com' })).toBeNull()
    expect(validarSuscripcion({ endpoint: sub.endpoint, keys: { p256dh: '' , auth: 'a' } })).toBeNull()
    expect(validarSuscripcion(null)).toBeNull()
  })
  it('descarta avisos mal formados y acota los textos', () => {
    const r = validarAvisos([aviso('a', 1), { id: '', cuando: 1, titulo: 'x' }, { id: 'b', cuando: 'ya', titulo: 'x' }, { id: 'c', cuando: 5, titulo: 'T'.repeat(500), cuerpo: 'C'.repeat(900) }])
    expect(r.map((a) => a.id)).toEqual(['a', 'c'])
    expect(r[1].titulo).toHaveLength(120)
    expect(r[1].cuerpo).toHaveLength(300)
  })
  it('no acepta más de 200 avisos', () => expect(validarAvisos(Array.from({ length: 300 }, (_, i) => aviso(String(i), i)))).toHaveLength(200))
})

describe('agenda', () => {
  it('el mismo dispositivo siempre tiene el mismo id, y otro distinto otro', async () => {
    expect(await idDe(sub.endpoint)).toBe(await idDe(sub.endpoint))
    expect(await idDe(sub.endpoint)).not.toBe(await idDe(sub.endpoint + 'x'))
  })
  it('sincronizar reemplaza los avisos del dispositivo', () => {
    let e: Estado = aplicarAgenda({}, 'd', sub, [aviso('a', 10)])
    e = aplicarAgenda(e, 'd', sub, [aviso('b', 20)])
    expect(e.d.avisos.map((a) => a.id)).toEqual(['b'])
  })
  it('manda lo vencido una sola vez, aunque la app lo vuelva a sincronizar', () => {
    let e = aplicarAgenda({}, 'd', sub, [aviso('a', 10), aviso('b', 99)])
    const r = sacarVencidos(e, 50)
    expect(r.vencidos.map((v) => v.aviso.id)).toEqual(['a'])
    e = aplicarAgenda(r.estado, 'd', sub, [aviso('a', 10), aviso('b', 99)])
    expect(sacarVencidos(e, 50).vencidos).toEqual([])
    expect(e.d.avisos.map((a) => a.id)).toEqual(['b'])
  })
  it('olvidar borra al dispositivo', () => expect(quitarSuscripcion(aplicarAgenda({}, 'd', sub, []), 'd')).toEqual({}))
  it('no pasa de 50 dispositivos', () => {
    let e: Estado = {}
    for (let i = 0; i < 60; i++) e = aplicarAgenda(e, 'd' + i, sub, [])
    expect(Object.keys(e)).toHaveLength(50)
  })
})

describe('envío', () => {
  it('con claves VAPID reales arma un aviso cifrado y firmado para Apple', async () => {
    const llaves = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    const pub = llaves.publicKey.export({ format: 'jwk' })
    const priv = llaves.privateKey.export({ format: 'jwk' })
    const b = (s: string) => Buffer.from(s, 'base64url')
    const publica = Buffer.concat([Buffer.from([4]), b(pub.x as string), b(pub.y as string)]).toString('base64url')
    // el "teléfono": otra pareja de llaves y un secreto de autenticación
    const tel = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey.export({ format: 'jwk' })
    const p256dh = Buffer.concat([Buffer.from([4]), b(tel.x as string), b(tel.y as string)]).toString('base64url')
    const payload = await buildPushPayload(
      { data: JSON.stringify({ titulo: 'Astia' }), options: { ttl: 60, urgency: 'high' } },
      { endpoint: 'https://web.push.apple.com/abc', expirationTime: null, keys: { p256dh, auth: randomBytes(16).toString('base64url') } },
      { subject: 'https://sebastianquisper-ui.github.io/Astia/', publicKey: publica, privateKey: priv.d as string },
    )
    const cab = new Headers(payload.headers as HeadersInit)
    expect(String(payload.method).toUpperCase()).toBe('POST')
    expect(cab.get('Authorization')).toMatch(/^vapid /)
    expect(cab.get('Content-Encoding')).toBe('aes128gcm')
    expect((payload.body as Uint8Array).byteLength).toBeGreaterThan(100)
  })
})
