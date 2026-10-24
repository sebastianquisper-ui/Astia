import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NOMBRE_ACCION, NOMBRE_EXPRESION, type AccionAlpi, type ExpresionAlpi } from './datos'

// La ruleta de Alpi: al tocarla dos veces (con todo cumplido) se abre una rueda de emotes alrededor; al tocar el
// centro, otra rueda con sus movimientos.

const EMOJI_EXPRESION: Record<ExpresionAlpi, string> = {
  normal: '🙂', feliz: '😄', emocionada: '🤩', curiosa: '🧐', dormida: '😴', concentrada: '🤓', sorpresa: '😮',
  triste: '😢', guino: '😉', molesta: '😠', furiosa: '🤬', reganona: '😒', orgullosa: '😌',
}
const EMOJI_ACCION: Record<AccionAlpi, string> = { saludar: '👋', saltar: '🦘', bailar: '💃', risa: '😂', explorar: '🧭' }
const EXPRESIONES = Object.keys(NOMBRE_EXPRESION) as ExpresionAlpi[]
const ACCIONES = Object.keys(NOMBRE_ACCION) as AccionAlpi[]

interface Opcion {
  id: string
  emoji: string
  texto: string
  activa?: boolean
}

/** Reparte las opciones en círculo, empezando arriba. */
function Anillo({ opciones, radio, alElegir, etiqueta }: { opciones: Opcion[]; radio: number; alElegir: (id: string) => void; etiqueta: string }) {
  return (
    <div role="group" aria-label={etiqueta}>
      {opciones.map((o, i) => {
        const ang = (Math.PI * 2 * i) / opciones.length - Math.PI / 2
        return (
          <button
            key={o.id}
            className="rueda-op"
            aria-pressed={o.activa}
            style={{ transform: `translate(${Math.cos(ang) * radio}px, ${Math.sin(ang) * radio}px)` }}
            onClick={() => alElegir(o.id)}
          >
            <span className="rueda-emoji" aria-hidden="true">{o.emoji}</span>
            <span className="rueda-texto">{o.texto}</span>
          </button>
        )
      })}
    </div>
  )
}

export function RuedaAlpi({ abierta, alCerrar, elegida, alElegirExpresion, alMovimiento }: {
  abierta: boolean
  alCerrar: () => void
  /** La expresión fijada a mano, o undefined si va en automático. */
  elegida?: ExpresionAlpi
  alElegirExpresion: (e: ExpresionAlpi | null) => void
  alMovimiento: (a: AccionAlpi) => void
}) {
  const [vista, setVista] = useState<'emotes' | 'movimientos'>('emotes')
  useEffect(() => {
    if (!abierta) return
    setVista('emotes')
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierta, alCerrar])

  if (!abierta) return null
  const emotes = vista === 'emotes'
  const opciones: Opcion[] = emotes
    ? [{ id: 'auto', emoji: '✨', texto: 'Automática', activa: !elegida }, ...EXPRESIONES.map((e) => ({ id: e, emoji: EMOJI_EXPRESION[e], texto: NOMBRE_EXPRESION[e], activa: elegida === e }))]
    : ACCIONES.map((a) => ({ id: a, emoji: EMOJI_ACCION[a], texto: NOMBRE_ACCION[a] }))

  return createPortal(
    <div className="rueda-fondo" onClick={alCerrar}>
      <div className="rueda" role="dialog" aria-modal="true" aria-label={emotes ? 'Emotes de Alpi' : 'Movimientos de Alpi'} onClick={(e) => e.stopPropagation()}>
        <Anillo
          key={vista}
          opciones={opciones}
          radio={emotes ? 138 : 100}
          etiqueta={emotes ? 'Expresiones' : 'Movimientos'}
          alElegir={(id) => {
            if (emotes) alElegirExpresion(id === 'auto' ? null : (id as ExpresionAlpi))
            else alMovimiento(id as AccionAlpi)
            alCerrar()
          }}
        />
        <button className="rueda-centro" onClick={() => setVista(emotes ? 'movimientos' : 'emotes')} aria-label={emotes ? 'Ver movimientos' : 'Ver emotes'}>
          <span aria-hidden="true">{emotes ? '💃' : '🙂'}</span>
          <small>{emotes ? 'Movimientos' : 'Emotes'}</small>
        </button>
      </div>
      <button className="rueda-cerrar" onClick={alCerrar}>Cerrar</button>
    </div>,
    document.body,
  )
}
