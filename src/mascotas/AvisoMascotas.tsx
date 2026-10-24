import { useAjustes } from '../ajustes/AjustesProvider'

/** Mientras uses la estrella de siempre, invita a conocer las mascotas nuevas. */
export function AvisoMascotas() {
  const { ajustes } = useAjustes()
  if (ajustes.mascota !== 'astia') return null
  return (
    <button className="enlace-modo" style={{ marginTop: 12 }} onClick={() => (window.location.hash = '#/mas/mascota')}>
      <span>Conoce a las mascotas que evolucionan contigo</span>
      <span>Ver →</span>
    </button>
  )
}
