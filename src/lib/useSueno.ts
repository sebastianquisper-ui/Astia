import { useCallback, useState } from 'react'
import { guardarLocal, leerLocal } from './almacen'
import { durmiendoAhora, olvidado, type RegistroSueno } from './sueno'

const CLAVE = 'astia.sueno'
const MAX_GUARDADOS = 120

/** El sueño se guarda en este teléfono (por ahora no se sincroniza con la nube). */
export function useSueno(ahora: Date) {
  const [registros, setRegistros] = useState(() => leerLocal<RegistroSueno[]>(CLAVE, []))

  const cambiar = useCallback((fn: (r: RegistroSueno[]) => RegistroSueno[]) => {
    setRegistros((previos) => {
      const nuevos = fn(previos).slice(0, MAX_GUARDADOS)
      guardarLocal(CLAVE, nuevos)
      return nuevos
    })
  }, [])

  const dormir = useCallback(() => cambiar((r) => (r.some((x) => x.desperto === undefined) ? r : [{ id: String(Date.now()), durmio: new Date().toISOString() }, ...r])), [cambiar])
  const despertar = useCallback(() => cambiar((r) => r.map((x) => (x.desperto === undefined ? { ...x, desperto: new Date().toISOString() } : x))), [cambiar])
  /** Descarta el registro abierto (por ejemplo, si olvidaste marcar que despertaste). */
  const descartar = useCallback(() => cambiar((r) => r.filter((x) => x.desperto !== undefined)), [cambiar])

  return { registros, durmiendo: durmiendoAhora(registros, ahora), olvidado: olvidado(registros, ahora), dormir, despertar, descartar }
}
