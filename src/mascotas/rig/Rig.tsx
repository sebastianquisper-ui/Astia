import { useId } from 'react'
import type { Animo } from '../../lib/avatar'
import { MASCOTAS, type MascotaId } from '../../lib/mascotas'
import { alpi, hooty, drako, stella } from './especiesB'
import { axolin, mochi, nube, taro } from './especiesA'
import type { Dibujar } from './tipos'

const DIBUJOS: Record<MascotaId, Dibujar> = { axolin, taro, nube, mochi, drako, stella, hooty, alpi }

interface Props {
  mascota: MascotaId
  etapa: number
  animo: Animo
  habla?: boolean
  /** Para las miniaturas: sin movimiento. */
  quieta?: boolean
}

/**
 * Dibuja una mascota por capas (atrás, cuerpo, cara, frente). Al inclinarla, cada capa se desplaza
 * un poco distinto (variables --ix / --iy): lo de atrás se queda atrás y los accesorios salen al frente.
 */
export function Rig({ mascota, etapa, animo, habla = false, quieta = false }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const total = MASCOTAS.find((m) => m.id === mascota)?.etapas.length ?? 4
  const capas = DIBUJOS[mascota]({ etapa, animo, habla, id: `${mascota}${etapa}${uid}` })
  // Más grande en cada etapa: la primera es la cría.
  const e = 0.8 + (0.2 * (Math.min(etapa, total) - 1)) / Math.max(1, total - 1)
  return (
    <svg className={'rig' + (quieta ? ' quieta' : '')} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>{capas.defs}</defs>
      <g transform={`translate(100 188) scale(${e.toFixed(3)}) translate(-100 -188)`}>
        <g className="rig-resp">
          <g className="rig-atras">{capas.atras}</g>
          <g className="rig-cuerpo">{capas.cuerpo}</g>
          <g className="rig-cara">{capas.cara}</g>
          <g className="rig-frente">{capas.frente}</g>
        </g>
      </g>
    </svg>
  )
}
