import { useAjustes } from '../ajustes/AjustesProvider'
import { intentarMusica } from '../sonidos/musica'
import { Icono } from './Icono'

/** Silencia o activa la música de fondo desde cualquier pantalla. */
export function BotonMusica() {
  const { ajustes, cambiar } = useAjustes()
  const sonidos = ajustes.sonidos ?? {}
  const activa = sonidos.musica?.activa !== false
  return (
    <button
      className="icono-btn"
      aria-label={activa ? 'Silenciar la música' : 'Activar la música'}
      aria-pressed={activa}
      onClick={() => {
        cambiar({ sonidos: { ...sonidos, musica: { ...sonidos.musica, activa: !activa } } })
        if (!activa) intentarMusica()
      }}
    >
      <Icono nombre={activa ? 'musica' : 'musicaOff'} tam={20} />
    </button>
  )
}
