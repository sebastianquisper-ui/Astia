// Las fotos de evidencia se guardan en el teléfono (IndexedDB), no junto a los datos: pesan mucho
// para localStorage y para la nube. La tarea solo guarda que tiene foto.

const BASE = 'astia-evidencias'
const ALMACEN = 'fotos'

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    if (typeof indexedDB === 'undefined') return mal(new Error('Este navegador no guarda fotos'))
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

export const guardarFoto = (tareaId: string, foto: string) => operar<void>('readwrite', (s) => s.put(foto, tareaId))
export const leerFoto = (tareaId: string) => operar<string | undefined>('readonly', (s) => s.get(tareaId)).catch(() => undefined)
export const borrarFoto = (tareaId: string) => operar<void>('readwrite', (s) => s.delete(tareaId)).catch(() => undefined)

/** Achica la foto (lado mayor 900 px, JPEG) para que no ocupe tanto. */
export function achicarFoto(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      const lado = 900
      const k = Math.min(1, lado / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      ok(c.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      mal(new Error('No se pudo leer la foto'))
    }
    img.src = url
  })
}
