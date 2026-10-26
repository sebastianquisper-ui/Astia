import { useCallback, useState } from 'react'
import { guardarLocal, leerLocal } from './almacen'
import { ymd } from './fechas'
import type { Energia } from './recomendaciones'

const CLAVE = 'astia.energia'

/** Cómo dijiste que estás hoy. Solo vale para hoy: mañana se vuelve a preguntar. */
export function useEnergia(ahora: Date): [Energia | null, (e: Energia | null) => void] {
  const hoy = ymd(ahora)
  const [guardada, setGuardada] = useState(() => leerLocal<{ fecha: string; nivel: Energia } | null>(CLAVE, null))
  const elegir = useCallback(
    (nivel: Energia | null) => {
      const nuevo = nivel ? { fecha: hoy, nivel } : null
      guardarLocal(CLAVE, nuevo)
      setGuardada(nuevo)
    },
    [hoy],
  )
  return [guardada && guardada.fecha === hoy ? guardada.nivel : null, elegir]
}
