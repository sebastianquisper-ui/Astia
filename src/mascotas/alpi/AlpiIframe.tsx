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
  className?: string
}

type Orden = { cmd: string; args: unknown[] }

/** Alpi en 3D dentro de un iframe: le manda órdenes con postMessage cuando está lista. */
export default function AlpiIframe({ nivel, expresion = 'normal', accion, vez = 0, embebida = true, sonido = false, accesorios, alTocar, className }: Props) {
  const marco = useRef<HTMLIFrameElement>(null)
  const lista = useRef(false)
  // Alpi se muestra solo cuando ya está armada y en su nivel: así no se ve nada a medias ni un dibujo de relleno
  const [visible, setVisible] = useState(false)
  const pendientes = useRef<Orden[]>([])
  const nivelVisto = useRef<NivelAlpi | null>(null)
  const doc = useMemo(() => documentoAlpi(embebida), [embebida])
  const alTocarRef = useRef(alTocar)
  alTocarRef.current = alTocar

  const enviar = (cmd: string, ...args: unknown[]) => {
    const w = marco.current?.contentWindow
    if (!lista.current || !w) {
      pendientes.current.push({ cmd, args })
      return
    }
    w.postMessage({ type: 'alpi', cmd, args }, '*')
  }

  useEffect(() => {
    const oir = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return
      if (e.data?.type === 'alpi-ready') {
        lista.current = true
        const cola = pendientes.current
        pendientes.current = []
        cola.forEach((o) => enviar(o.cmd, ...o.args))
        // un instante para que el modelo aplique el nivel y la ropa antes de mostrarse
        window.setTimeout(() => setVisible(true), 150)
      }
      if (e.data?.type === 'alpi-toque') alTocarRef.current?.()
    }
    window.addEventListener('message', oir)
    return () => window.removeEventListener('message', oir)
  }, [])

  // Nivel: el primero se pone de una; si sube después, Alpi hace su transformación.
  useEffect(() => {
    if (nivelVisto.current === null) enviar('setLevelInstant', nivel)
    else if (nivelVisto.current !== nivel) enviar('setLevel', nivel)
    nivelVisto.current = nivel
  }, [nivel])
  useEffect(() => enviar('setExpression', expresion), [expresion])
  useEffect(() => {
    if (accion) enviar('play', accion)
  }, [accion, vez])
  useEffect(() => enviar('setSound', sonido), [sonido])
  const claveAccesorios = JSON.stringify(accesorios ?? null)
  useEffect(() => {
    if (accesorios) for (const [k, on] of Object.entries(accesorios)) enviar('setAccessory', k, on)
  }, [claveAccesorios])

  return <iframe ref={marco} className={'alpi-iframe' + (visible ? ' lista' : '') + (className ? ' ' + className : '')} title="Alpi en 3D" srcDoc={doc} sandbox="allow-scripts" />
}
