import { useEffect, useRef, useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { debeCelebrar } from '../lib/mascotas'
import { sonar } from '../sonidos/reproductor'
import { Hoja } from '../ui/Hoja'
import { MascotaVista } from './MascotaVista'
import { useMascota } from './useMascota'

/**
 * Cuando tu mascota puede evolucionar, aparece con su nivel de antes y un botón: al tocarlo se transforma, con su sonido.
 * (El toque también es lo que deja sonar al audio en el iPhone.) Se celebra una sola vez por cada etapa nueva.
 */
export function CelebracionEvolucion() {
  const { ajustes, cambiar } = useAjustes()
  const { mascota, estado } = useMascota()
  const vista = mascota ? ajustes.mascotaVista[mascota.id] : undefined
  const [paso, setPaso] = useState<'previa' | 'evolucionando' | 'hecha'>('previa')
  const [lista, setLista] = useState(false)
  const temporizador = useRef<number>(0)

  // Si no hay registro de lo que ya viste (por ejemplo, venías de otra versión), se guarda sin celebrar
  useEffect(() => {
    if (mascota && estado && vista === undefined) cambiar({ mascotaVista: { ...ajustes.mascotaVista, [mascota.id]: estado.indice } })
  }, [mascota, estado, vista, ajustes.mascotaVista, cambiar])

  const celebrar = !!mascota && !!estado && debeCelebrar(vista, estado.indice)
  // Alpi tarda un instante en aparecer: el botón se activa cuando ya se ve
  useEffect(() => {
    if (!celebrar) return
    setLista(false)
    const id = window.setTimeout(() => setLista(true), 1400)
    return () => window.clearTimeout(id)
  }, [celebrar])
  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  if (!mascota || !estado) return null
  const nueva = estado.indice + 1
  const anterior = (vista ?? estado.indice) + 1
  const marcarVista = () => {
    cambiar({ mascotaVista: { ...ajustes.mascotaVista, [mascota.id]: estado.indice } })
    setPaso('previa')
  }
  const evolucionar = () => {
    setPaso('evolucionando')
    void sonar('evolucion')
    temporizador.current = window.setTimeout(() => setPaso('hecha'), 3600)
  }
  const titulo = paso === 'hecha' ? '¡Evolucionó!' : paso === 'evolucionando' ? '¡Se está transformando!' : '¡Hora de evolucionar!'

  return (
    <Hoja titulo={titulo} abierta={celebrar} alCerrar={marcarVista}>
      <div className="celebracion">
        <MascotaVista mascota={mascota.id} etapa={paso === 'previa' ? anterior : nueva} animo="contenta" tam={190} fiesta={paso === 'hecha'} />
        {paso === 'hecha' ? (
          <>
            <h3 className="titulo">{mascota.nombre} ahora es {estado.nombreEtapa}</h3>
            <p className="sub">Nivel {nueva} de {estado.etapas}. Tu constancia lo hizo posible: tareas cumplidas, hábitos y cuidarte cuentan.</p>
            <div className="acciones" style={{ width: '100%' }}>
              <button className="btn" onClick={marcarVista}>¡Genial!</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="titulo">{mascota.nombre} está listo para ser {estado.nombreEtapa}</h3>
            <p className="sub">Nivel {nueva} de {estado.etapas}. Tu constancia lo hizo posible. Toca el botón y mira cómo se transforma.</p>
            <div className="acciones" style={{ width: '100%' }}>
              <button className="btn suave" onClick={marcarVista} disabled={paso === 'evolucionando'}>Saltar</button>
              <button className="btn" onClick={evolucionar} disabled={!lista || paso === 'evolucionando'}>
                {paso === 'evolucionando' ? 'Transformándose…' : '¡Evolucionar!'}
              </button>
            </div>
          </>
        )}
      </div>
    </Hoja>
  )
}
