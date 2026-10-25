import { useEffect, useMemo, useRef, useState } from 'react'
import { documentoAlpi } from './documento'
import type { AccionAlpi, ExpresionAlpi, NivelAlpi } from './datos'

interface Props {
  nivel: NivelAlpi
  expresion?: ExpresionAlpi
  /** Una acción para hacer una vez; cambia `vez` para repetirla. */
  accion?: AccionAlpi
  vez?: number
  /** Embebida: solo Alpi, sin controles. Si no, la página completa con todos sus botones. */
  embebida?: boolean
  sonido?: boolean
  /** Qué ropa y accesorios lleva (del vestidor). */
  accesorios?: Record<string, boolean>
  alTocar?: () => void
  /** Dos toques seguidos (la ruleta). */
  alDobleToque?: () => void
  className?: string
}

/**
 * Alpi en 3D dentro de un iframe: le manda órdenes con postMessage cuando está lista.
 * Cada vez que el 3D termina de cargar (o se recarga) se le reenvía TODO su estado (nivel, expresión, ropa),
 * así nunca aparece con los valores de fábrica aunque el aviso de "lista" llegue antes de que la app lo escuche.
 */
export default function AlpiIframe({ nivel, expresion = 'normal', accion, vez = 0, embebida = true, sonido = false, accesorios, alTocar, alDobleToque, className }: Props) {
  const marco = useRef<HTMLIFrameElement>(null)
  const lista = useRef(false)
  // Alpi se muestra solo cuando ya está armada y en su nivel: así no se ve nada a medias ni un dibujo de relleno
  const [visible, setVisible] = useState(false)
  const nivelVisto = useRef<NivelAlpi | null>(null)
  const doc = useMemo(() => documentoAlpi(embebida), [embebida])
  const alTocarRef = useRef(alTocar)
  alTocarRef.current = alTocar
  const alDobleRef = useRef(alDobleToque)
  alDobleRef.current = alDobleToque
  // Lo último que se pidió, para reenviarlo cuando el 3D esté listo
  const actual = useRef({ nivel, expresion, sonido, accesorios })
  actual.current = { nivel, expresion, sonido, accesorios }
  const accionPendiente = useRef<AccionAlpi | undefined>(undefined)

  const enviar = (cmd: string, ...args: unknown[]) => {
    const w = marco.current?.contentWindow
    if (lista.current && w) w.postMessage({ type: 'alpi', cmd, args }, '*')
  }

  const enviarTodo = () => {
    const a = actual.current
    enviar('setLevelInstant', a.nivel)
    nivelVisto.current = a.nivel
    enviar('setExpression', a.expresion)
    enviar('setSound', a.sonido)
    if (a.accesorios) for (const [k, on] of Object.entries(a.accesorios)) enviar('setAccessory', k, on)
    if (accionPendiente.current) {
      enviar('play', accionPendiente.current)
      accionPendiente.current = undefined
    }
  }

  const alEstarLista = () => {
    if (lista.current) return // ya se envió para esta carga
    lista.current = true
    enviarTodo()
    // un instante para que el modelo aplique el nivel y la ropa antes de mostrarse
    window.setTimeout(() => setVisible(true), 150)
  }

  useEffect(() => {
    const oir = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return
      if (e.data?.type === 'alpi-ready' || e.data?.type === 'alpi-state') alEstarLista()
      if (e.data?.type === 'alpi-toque') alTocarRef.current?.()
      if (e.data?.type === 'alpi-doble') (alDobleRef.current ?? alTocarRef.current)?.()
    }
    window.addEventListener('message', oir)
    return () => window.removeEventListener('message', oir)
  }, [])

  // Si el aviso de "lista" se perdió, al cargar el iframe se le pregunta su estado: su respuesta cuenta igual
  const alCargar = () => {
    lista.current = false
    marco.current?.contentWindow?.postMessage({ type: 'alpi', cmd: 'getState', args: [] }, '*')
  }

  // Nivel: el primero se pone de una; si sube después, Alpi hace su transformación.
  useEffect(() => {
    if (nivelVisto.current !== null && nivelVisto.current !== nivel) {
      enviar('setLevel', nivel)
      nivelVisto.current = nivel
    }
  }, [nivel])
  useEffect(() => enviar('setExpression', expresion), [expresion])
  useEffect(() => {
    if (!accion) return
    if (lista.current) enviar('play', accion)
    else accionPendiente.current = accion
  }, [accion, vez])
  useEffect(() => enviar('setSound', sonido), [sonido])
  const claveAccesorios = JSON.stringify(accesorios ?? null)
  useEffect(() => {
    if (accesorios) for (const [k, on] of Object.entries(accesorios)) enviar('setAccessory', k, on)
  }, [claveAccesorios])

  return <iframe ref={marco} className={'alpi-iframe' + (visible ? ' alpi-visible' : '') + (className ? ' ' + className : '')} title="Alpi en 3D" srcDoc={doc} sandbox="allow-scripts" onLoad={alCargar} />
}
