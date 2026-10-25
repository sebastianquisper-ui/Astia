// Las pistas de música que subes se guardan en el teléfono (IndexedDB), junto a tus sonidos.
import { MAX_BYTES_MUSICA, MAX_MINUTOS_MUSICA } from './musica'

const EXTENSIONES = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|caf|aif|aiff)$/i

export function validarPista(f: { name: string; type: string; size: number }): string | null {
  if (!(f.type.startsWith('audio/') || EXTENSIONES.test(f.name))) return 'Ese archivo no parece un audio. Usa mp3, m4a, wav u ogg.'
  if (f.size > MAX_BYTES_MUSICA) return `Esa pista pesa demasiado (máximo ${Math.round(MAX_BYTES_MUSICA / 1024 / 1024)} MB).`
  if (f.size === 0) return 'Ese archivo está vacío.'
  return null
}
export const MAX_SEGUNDOS_MUSICA = MAX_MINUTOS_MUSICA * 60

const BASE = 'astia-musica'
const ALMACEN = 'pistas'

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
export const guardarPista = (id: string, archivo: Blob) => operar<void>('readwrite', (s) => s.put(archivo, id))
export const leerPista = (id: string) => operar<Blob | undefined>('readonly', (s) => s.get(id)).catch(() => undefined)
export const borrarPista = (id: string) => operar<void>('readwrite', (s) => s.delete(id)).catch(() => undefined)
