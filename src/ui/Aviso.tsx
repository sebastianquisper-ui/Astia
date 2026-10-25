import { hablar } from '../sonidos/voz'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// Regla de oro de la v2: TODA acción muestra confirmación o error claro.
// Cualquier pantalla puede llamar a avisar('Guardado') o avisar('No se pudo...', 'error').

type Tipo = 'ok' | 'error'
/** `accion`: un botón en el aviso (por ejemplo "Deshacer"). `duracion`: milisegundos que se queda visible. */
export interface OpcionesAviso {
  accion?: string
  alAccion?: () => void
  duracion?: number
}
type Avisar = (mensaje: string, tipo?: Tipo, opciones?: OpcionesAviso) => void

const AvisoContext = createContext<Avisar>(() => {})
export const useAviso = () => useContext(AvisoContext)

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [actual, setActual] = useState<{ mensaje: string; tipo: Tipo; opciones?: OpcionesAviso } | null>(null)
  const temporizador = useRef<number>(0)

  const avisar = useCallback<Avisar>((mensaje, tipo = 'ok', opciones) => {
    setActual({ mensaje, tipo, opciones })
    hablar(mensaje)
    window.clearTimeout(temporizador.current)
    // Los errores duran más para que dé tiempo de leerlos; un aviso con botón, también
    temporizador.current = window.setTimeout(() => setActual(null), opciones?.duracion ?? (tipo === 'error' ? 4500 : opciones?.accion ? 6000 : 2400))
  }, [])

  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      {actual && (
        <div className={'aviso ' + (actual.tipo === 'error' ? 'error' : '')} role="status" aria-live="polite">
          {actual.mensaje}
          {actual.opciones?.accion && (
            <button
              className="aviso-accion"
              onClick={() => {
                actual.opciones?.alAccion?.()
                setActual(null)
              }}
            >
              {actual.opciones.accion}
            </button>
          )}
        </div>
      )}
    </AvisoContext.Provider>
  )
}
