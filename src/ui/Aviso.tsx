import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// Regla de oro de la v2: TODA acción muestra confirmación o error claro.
// Cualquier pantalla puede llamar a avisar('Guardado') o avisar('No se pudo...', 'error').

type Tipo = 'ok' | 'error'
type Avisar = (mensaje: string, tipo?: Tipo) => void

const AvisoContext = createContext<Avisar>(() => {})
export const useAviso = () => useContext(AvisoContext)

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [actual, setActual] = useState<{ mensaje: string; tipo: Tipo } | null>(null)
  const temporizador = useRef<number>(0)

  const avisar = useCallback<Avisar>((mensaje, tipo = 'ok') => {
    setActual({ mensaje, tipo })
    window.clearTimeout(temporizador.current)
    // Los errores duran más para que dé tiempo de leerlos
    temporizador.current = window.setTimeout(() => setActual(null), tipo === 'error' ? 4500 : 2400)
  }, [])

  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      {actual && (
        <div className={'aviso ' + (actual.tipo === 'error' ? 'error' : '')} role="status" aria-live="polite">
          {actual.mensaje}
        </div>
      )}
    </AvisoContext.Provider>
  )
}
