import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Animo } from '../lib/avatar'
import type { MascotaId } from '../lib/mascotas'
import { fondoDe } from './sprites'
import { Rig } from './rig/Rig'

import { desdeAnimo, nivelAlpi } from './alpi/datos'
import { hayWebGL } from './alpi/webgl'

// Alpi en 3D (su propia página con la librería 3D adentro): se descarga solo cuando aparece.
const AlpiIframe = lazy(() => import('./alpi/AlpiIframe'))

interface Chispa {
  id: number
  dx: number
  dy: number
  simbolo: string
}
const SIMBOLOS = ['✦', '♥', '✧', '★']
const limita = (n: number) => Math.max(-1, Math.min(1, n))

interface Props {
  mascota: MascotaId
  /** Etapa a mostrar (la primera es la 1). */
  etapa: number
  animo?: Animo
  habla?: boolean
  tam?: number
  /** Si se pasa, se muestra "Nv N" abajo. */
  nivel?: number
  /** Para celebrar (la Alpi 3D baila). */
  fiesta?: boolean
}

/**
 * Una mascota con movimiento. Está dibujada por piezas (ojos, boca, orejas, cola, accesorios) que se
 * mueven solas; al tocarla se inclina con perspectiva, las capas se separan y salta con chispas.
 * El ánimo cambia cómo se mueve: duerme, se alerta o celebra.
 */
export function MascotaVista({ mascota, etapa, animo = 'seria', habla = false, tam = 112, nivel, fiesta = false }: Props) {
  const raiz = useRef<HTMLSpanElement>(null)
  const [inclina, setInclina] = useState<{ x: number; y: number } | null>(null)
  const [saltando, setSaltando] = useState(false)
  const [chispas, setChispas] = useState<Chispa[]>([])
  const contador = useRef(0)
  const temporizadores = useRef<number[]>([])
  useEffect(() => () => temporizadores.current.forEach(window.clearTimeout), [])

  const inclinar = (e: PointerEvent) => {
    const r = raiz.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    setInclina({ x: limita(((e.clientX - r.left) / r.width - 0.5) * 2), y: limita(((e.clientY - r.top) / r.height - 0.5) * 2) })
  }
  const soltar = () => setInclina(null)

  const tocar = (e: PointerEvent) => {
    inclinar(e)
    setSaltando(true)
    temporizadores.current.push(window.setTimeout(() => setSaltando(false), mascota === 'alpi' ? 900 : 560))
    const nuevas = Array.from({ length: 6 }, (_, i): Chispa => {
      const ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.6
      return { id: ++contador.current, dx: Math.cos(ang) * (tam * 0.62), dy: Math.sin(ang) * (tam * 0.62) - tam * 0.1, simbolo: SIMBOLOS[(i + contador.current) % SIMBOLOS.length] }
    })
    setChispas((c) => [...c, ...nuevas])
    temporizadores.current.push(window.setTimeout(() => setChispas((c) => c.filter((x) => !nuevas.some((n) => n.id === x.id))), 800))
  }

  const en3d = mascota === 'alpi' && hayWebGL()
  const clases = ['avatar', 'mascota', animo, en3d ? 'en3d' : '', habla ? 'habla' : '', saltando ? 'saltando' : '', inclina ? 'activa' : ''].filter(Boolean).join(' ')
  const transformacion = inclina && !en3d ? `rotateY(${inclina.x * 20}deg) rotateX(${-inclina.y * 20}deg) scale(1.04)` : undefined

  return (
    <span
      ref={raiz}
      className={clases}
      data-sprite={`${mascota}-${etapa}`}
      style={{ width: tam, height: tam, ['--ix' as string]: inclina?.x ?? 0, ['--iy' as string]: inclina?.y ?? 0 }}
      onPointerMove={inclinar}
      onPointerDown={tocar}
      onPointerLeave={soltar}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <span className="mascota-sombra" aria-hidden="true" />
      <span className="mascota-marco vec" style={{ transform: transformacion }}>
        {en3d ? (
          <Suspense fallback={<Rig mascota={mascota} etapa={etapa} animo={animo} habla={habla} />}>
            <AlpiIframe nivel={nivelAlpi(etapa)} {...desdeAnimo(animo, { fiesta })} />
          </Suspense>
        ) : (
          <Rig key={mascota + etapa} mascota={mascota} etapa={etapa} animo={animo} habla={habla} />
        )}
      </span>
      {animo === 'durmiendo' && (
        <span className="zzz" aria-hidden="true">
          z<small>z</small>
        </span>
      )}
      {animo === 'alerta' && <span className="mascota-alerta" aria-hidden="true">!</span>}
      {chispas.map((c) => (
        <span key={c.id} className="chispa" aria-hidden="true" style={{ ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px` }}>
          {c.simbolo}
        </span>
      ))}
      {nivel !== undefined && <span className="mascota-nivel">Nv {nivel}</span>}
    </span>
  )
}

/** Una imagen quieta de una mascota (para listas y para la evolución). */
export function MascotaMini({ mascota, etapa, bloqueada = false, tam = 72 }: { mascota: MascotaId; etapa: number; bloqueada?: boolean; tam?: number }) {
  return (
    <span className={'mascota-mini' + (bloqueada ? ' bloqueada' : '')} style={{ width: tam, height: tam, background: fondoDe(mascota, etapa) }} aria-hidden="true">
      <Rig mascota={mascota} etapa={etapa} animo="contenta" quieta />
    </span>
  )
}
