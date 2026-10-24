import { useEffect, useRef, useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { SEGUNDOS_DE_DESCANSO, segundosParaDescansar } from '../lib/descansoVista'
import { Hoja } from './Hoja'

/**
 * Recordatorio 20-20-20 para cuidar la vista. Cuenta solo el tiempo que Astia está abierta y a la vista
 * (no manda notificaciones: eso llega con la nube). Al cumplirse 20 minutos, propone mirar lejos 20 segundos.
 */
export function DescansoVista() {
  const { ajustes } = useAjustes()
  const activo = ajustes.descansoVista !== false
  const usados = useRef(0)
  const [descansando, setDescansando] = useState(false)
  const [quedan, setQuedan] = useState(SEGUNDOS_DE_DESCANSO)

  // Cada segundo visible suma uso; al llegar a 20 minutos se abre el descanso
  useEffect(() => {
    if (!activo || descansando) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      usados.current += 1
      if (segundosParaDescansar(usados.current) <= 0) {
        usados.current = 0
        setQuedan(SEGUNDOS_DE_DESCANSO)
        setDescansando(true)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [activo, descansando])

  // Cuenta regresiva de los 20 segundos
  useEffect(() => {
    if (!descansando) return
    const id = window.setInterval(() => setQuedan((q) => Math.max(0, q - 1)), 1000)
    return () => window.clearInterval(id)
  }, [descansando])

  if (!activo) return null
  const cerrar = () => setDescansando(false)
  return (
    <Hoja titulo="Descansa la vista" abierta={descansando} alCerrar={cerrar}>
      <p>Llevas 20 minutos con la pantalla. Mira algo que esté lejos, a unos 6 metros (una ventana, el fondo de la calle), durante 20 segundos.</p>
      <p className="descanso-cuenta" aria-live="off">{quedan > 0 ? quedan : '¡Listo!'}</p>
      <div className="acciones">
        <button className="btn suave" onClick={cerrar}>Ahora no</button>
        <button className="btn" onClick={cerrar} disabled={quedan > 0}>{quedan > 0 ? 'Mirando lejos…' : 'Ya miré lejos'}</button>
      </div>
    </Hoja>
  )
}
