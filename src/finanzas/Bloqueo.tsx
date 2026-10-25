import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'

// Finanstia se abre con PIN. Se vuelve a cerrar al salir de Finanstia, al bloquear a mano o si la app pasó
// más de 2 minutos en segundo plano.

export const MINUTOS_PARA_BLOQUEAR = 2

interface Bloqueo {
  abierto: boolean
  abrir: () => void
  bloquear: () => void
}

const BloqueoContext = createContext<Bloqueo | null>(null)
export function useBloqueo(): Bloqueo {
  const b = useContext(BloqueoContext)
  if (!b) throw new Error('useBloqueo se usa dentro de <BloqueoProvider>')
  return b
}

export function BloqueoProvider({ children }: { children: ReactNode }) {
  const { ajustes } = useAjustes()
  const [abierto, setAbierto] = useState(false)
  const segundoPlano = useRef<number | null>(null)

  // Al salir de Finanstia se cierra
  useEffect(() => {
    if (ajustes.modo !== 'finanzas') setAbierto(false)
  }, [ajustes.modo])

  // Si la app estuvo mucho rato oculta, también
  useEffect(() => {
    const alCambiar = () => {
      if (document.visibilityState === 'hidden') segundoPlano.current = Date.now()
      else if (segundoPlano.current !== null) {
        if (Date.now() - segundoPlano.current > MINUTOS_PARA_BLOQUEAR * 60_000) setAbierto(false)
        segundoPlano.current = null
      }
    }
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [])

  const abrir = useCallback(() => setAbierto(true), [])
  const bloquear = useCallback(() => setAbierto(false), [])
  const valor = useMemo(() => ({ abierto, abrir, bloquear }), [abierto, abrir, bloquear])
  return <BloqueoContext.Provider value={valor}>{children}</BloqueoContext.Provider>
}
