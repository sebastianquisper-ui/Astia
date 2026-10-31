// Lo que hace el servidor, sin red ni almacenamiento: así se puede probar.

export interface Aviso {
  id: string
  /** Momento exacto en milisegundos desde 1970. */
  cuando: number
  titulo: string
  cuerpo: string
}

export interface Suscripcion {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface Registro {
  sub: Suscripcion
  avisos: Aviso[]
  /** Ids ya enviados, para que una nueva sincronización no los repita. */
  enviados: string[]
}

export type Estado = Record<string, Registro>

export const MAX_AVISOS = 200
export const MAX_ENVIADOS = 200
export const MAX_SUSCRIPCIONES = 50

const texto = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '')

export function validarSuscripcion(x: unknown): Suscripcion | null {
  const s = x as Partial<Suscripcion> | null
  if (!s || typeof s.endpoint !== 'string' || !s.endpoint.startsWith('https://') || s.endpoint.length > 1000) return null
  const { p256dh, auth } = s.keys ?? ({} as Partial<Suscripcion['keys']>)
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return null
  return { endpoint: s.endpoint, keys: { p256dh, auth } }
}

/** Se queda solo con avisos bien formados, con textos acotados y a lo sumo MAX_AVISOS. */
export function validarAvisos(x: unknown): Aviso[] {
  if (!Array.isArray(x)) return []
  const lista: Aviso[] = []
  for (const a of x.slice(0, MAX_AVISOS)) {
    const id = texto(a?.id, 80)
    const titulo = texto(a?.titulo, 120)
    if (!id || !titulo || typeof a?.cuando !== 'number' || !Number.isFinite(a.cuando)) continue
    lista.push({ id, cuando: Math.round(a.cuando), titulo, cuerpo: texto(a?.cuerpo, 300) })
  }
  return lista
}

/** Un identificador corto y no adivinable a partir de la dirección de la suscripción. */
export async function idDe(endpoint: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

/** Guarda la suscripción y reemplaza sus avisos por los nuevos (sin repetir los ya enviados). */
export function aplicarAgenda(estado: Estado, id: string, sub: Suscripcion, avisos: Aviso[]): Estado {
  const previo = estado[id]
  if (!previo && Object.keys(estado).length >= MAX_SUSCRIPCIONES) return estado
  const enviados = previo?.enviados ?? []
  return { ...estado, [id]: { sub, avisos: avisos.filter((a) => !enviados.includes(a.id)), enviados } }
}

export function quitarSuscripcion(estado: Estado, id: string): Estado {
  const { [id]: _quitada, ...resto } = estado
  return resto
}

export interface Pendiente {
  id: string
  sub: Suscripcion
  aviso: Aviso
}

/** Separa los avisos cuya hora ya llegó; los quita de la lista y los anota como enviados. */
export function sacarVencidos(estado: Estado, ahora: number): { vencidos: Pendiente[]; estado: Estado } {
  const vencidos: Pendiente[] = []
  const nuevo: Estado = {}
  for (const [id, r] of Object.entries(estado)) {
    const listos = r.avisos.filter((a) => a.cuando <= ahora)
    for (const aviso of listos) vencidos.push({ id, sub: r.sub, aviso })
    nuevo[id] = listos.length ? { ...r, avisos: r.avisos.filter((a) => a.cuando > ahora), enviados: [...r.enviados, ...listos.map((a) => a.id)].slice(-MAX_ENVIADOS) } : r
  }
  return { vencidos, estado: nuevo }
}
