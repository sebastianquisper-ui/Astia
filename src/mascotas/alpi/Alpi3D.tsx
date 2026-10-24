import { Component, lazy, Suspense, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Rig } from '../rig/Rig'
import { efectoDe, type AnimacionAlpi, type ExpresionAlpi, type NivelAlpi } from './datos'

// El código 3D (Three.js) se descarga solo cuando Alpi aparece en pantalla.
const Escena = lazy(() => import('./Escena'))

let webgl: boolean | undefined
/** ¿Este teléfono puede dibujar 3D? Si no, se usa la Alpi dibujada en vectores. */
export function hayWebGL(): boolean {
  if (webgl !== undefined) return webgl
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webgl = false
  }
  return webgl
}

/** Si el 3D falla (el teléfono o la página no lo permiten), se queda la Alpi dibujada y la app sigue. */
class SiFalla extends Component<{ respaldo: ReactNode; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  render() {
    return this.state.fallo ? this.props.respaldo : this.props.children
  }
}

const TEXTO_EFECTO = { zzz: ['z', 'z', 'Z'], pregunta: ['?'], exclama: ['!'], corazones: ['♥', '♥', '♥'], chispas: ['✦', '★', '✧', '✦'] }

interface Props {
  nivel: NivelAlpi
  expresion: ExpresionAlpi
  animacion: AnimacionAlpi
  habla?: boolean
  inclina?: { x: number; y: number } | null
  /** Permite girarla arrastrando con el dedo (en la pantalla de prueba). */
  girable?: boolean
  /** Muestra zzz, ?, !, corazones o chispas según el estado. */
  efectos?: boolean
}

/** Alpi en 3D, con su respaldo vectorial y sus efectos (zzz, ?, !, corazones, chispas). */
export function Alpi3D({ nivel, expresion, animacion, habla = false, inclina = null, girable = false, efectos = false }: Props) {
  const [giro, setGiro] = useState(0)
  const arrastre = useRef<number | null>(null)
  const efecto = efectos ? efectoDe(expresion, animacion) : null
  const animo = expresion === 'dormida' ? 'durmiendo' : expresion === 'sorprendida' ? 'alerta' : expresion === 'feliz' || expresion === 'emocionada' ? 'contenta' : 'seria'
  const respaldo = <Rig mascota="alpi" etapa={nivel} animo={animo} habla={habla} />

  const eventos = girable
    ? {
        onPointerDown: (e: PointerEvent) => {
          arrastre.current = e.clientX
          ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        },
        onPointerMove: (e: PointerEvent) => {
          if (arrastre.current === null) return
          setGiro((g) => g + (e.clientX - arrastre.current!) * 0.012)
          arrastre.current = e.clientX
        },
        onPointerUp: () => (arrastre.current = null),
        onPointerCancel: () => (arrastre.current = null),
      }
    : {}

  return (
    <div className={'alpi3d' + (girable ? ' girable' : '')} data-nivel={nivel} data-expresion={expresion} data-animacion={animacion} {...eventos}>
      {hayWebGL() ? (
        <SiFalla respaldo={respaldo}>
          <Suspense fallback={respaldo}>
            <Escena nivel={nivel} expresion={expresion} animacion={animacion} habla={habla} giro={giro} inclina={inclina} />
          </Suspense>
        </SiFalla>
      ) : (
        respaldo
      )}
      {efecto && (
        <span key={efecto} className={`alpi-efecto ${efecto}`} aria-hidden="true">
          {TEXTO_EFECTO[efecto].map((t, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.35}s` }}>{t}</span>
          ))}
        </span>
      )}
    </div>
  )
}
