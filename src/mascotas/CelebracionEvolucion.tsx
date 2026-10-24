import { useEffect } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { debeCelebrar } from '../lib/mascotas'
import { Hoja } from '../ui/Hoja'
import { MascotaVista } from './MascotaVista'
import { useMascota } from './useMascota'

/** Cuando tu mascota evoluciona, se muestra una celebración (una sola vez por cada etapa nueva). */
export function CelebracionEvolucion() {
  const { ajustes, cambiar } = useAjustes()
  const { mascota, estado } = useMascota()
  const vista = mascota ? ajustes.mascotaVista[mascota.id] : undefined

  // Si no hay registro de lo que ya viste (por ejemplo, venías de otra versión), se guarda sin celebrar
  useEffect(() => {
    if (mascota && estado && vista === undefined) cambiar({ mascotaVista: { ...ajustes.mascotaVista, [mascota.id]: estado.indice } })
  }, [mascota, estado, vista, ajustes.mascotaVista, cambiar])

  if (!mascota || !estado) return null
  const celebrar = debeCelebrar(vista, estado.indice)
  const marcarVista = () => cambiar({ mascotaVista: { ...ajustes.mascotaVista, [mascota.id]: estado.indice } })

  return (
    <Hoja titulo="¡Evolucionó!" abierta={celebrar} alCerrar={marcarVista}>
      <div className="celebracion">
        <MascotaVista mascota={mascota.id} etapa={estado.indice + 1} animo="contenta" tam={190} />
        <h3 className="titulo">{mascota.nombre} ahora es {estado.nombreEtapa}</h3>
        <p className="sub">Nivel {estado.indice + 1} de {estado.etapas}. Tu constancia lo hizo posible: tareas cumplidas, hábitos y cuidarte cuentan.</p>
        <div className="acciones" style={{ width: '100%' }}>
          <button className="btn" onClick={marcarVista}>¡Genial!</button>
        </div>
      </div>
    </Hoja>
  )
}
