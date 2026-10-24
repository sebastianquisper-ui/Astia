import { useAjustes } from '../ajustes/AjustesProvider'

/** Mientras uses la estrella de siempre, invita a conocer a Alpi. */
export function AvisoMascotas() {
  const { ajustes } = useAjustes()
  if (ajustes.mascota !== 'astia') return null
  return (
    <button className="enlace-modo" style={{ marginTop: 12 }} onClick={() => (window.location.hash = '#/mas/mascota')}>
      <span>Conoce a Alpi, la alpaca que evoluciona contigo</span>
      <span>Ver →</span>
    </button>
  )
}
