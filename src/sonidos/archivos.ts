import type { EventoSonido } from './catalogo'

// Tus propios sonidos se guardan en el teléfono (IndexedDB), no en la nube: son archivos y pesan.

export const MAX_BYTES = 2.5 * 1024 * 1024
export const MAX_SEGUNDOS = 30
const EXTENSIONES = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|caf|aif|aiff)$/i

/** ¿Este archivo parece un audio que se puede usar? Devuelve el motivo si no. */
export function validarArchivoSonido(f: { name: string; type: string; size: number }): string | null {
  if (!(f.type.startsWith('audio/') || EXTENSIONES.test(f.name))) return 'Ese archivo no parece un audio. Usa mp3, m4a, wav u ogg.'
  if (f.size > MAX_BYTES) return `Ese audio pesa demasiado (máximo ${Math.round(MAX_BYTES / 1024 / 1024 * 10) / 10} MB). Recórtalo o usa uno más corto.`
  if (f.size === 0) return 'Ese archivo está vacío.'
  return null
}

const BASE = 'astia-sonidos'
const ALMACEN = 'archivos'

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    if (typeof indexedDB === 'undefined') return mal(new Error('Este navegador no guarda audios'))
    const pedido = indexedDB.open(BASE, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN)
    pedido.onsuccess = () => ok(pedido.result)
    pedido.onerror = () => mal(pedido.error)
  })
}

async function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await abrir()
  return new Promise<T>((ok, mal) => {
    const pedido = fn(db.transaction(ALMACEN, modo).objectStore(ALMACEN))
    pedido.onsuccess = () => ok(pedido.result as T)
    pedido.onerror = () => mal(pedido.error)
  })
}

export const guardarSonido = (evento: EventoSonido, archivo: Blob) => operar<void>('readwrite', (s) => s.put(archivo, evento))
export const leerSonido = (evento: EventoSonido) => operar<Blob | undefined>('readonly', (s) => s.get(evento)).catch(() => undefined)
export const borrarSonido = (evento: EventoSonido) => operar<void>('readwrite', (s) => s.delete(evento)).catch(() => undefined)

/** Cuánto dura el audio, en segundos (null si no se puede leer: probablemente no sea un audio válido). */
export function duracionDe(blob: Blob): Promise<number | null> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(blob)
    const a = new Audio()
    const fin = (d: number | null) => {
      URL.revokeObjectURL(url)
      ok(d)
    }
    a.preload = 'metadata'
    a.onloadedmetadata = () => fin(Number.isFinite(a.duration) ? a.duration : null)
    a.onerror = () => fin(null)
    window.setTimeout(() => fin(null), 6000)
    a.src = url
  })
}
