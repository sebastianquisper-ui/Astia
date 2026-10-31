import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useAviso } from '../ui/Aviso'
import { activarAvisos, desactivarAvisos, enviarAvisoDePrueba, esAppInstalada, permisoDeAvisos, pushConfigurado, pushSoportado } from './push'

/** Más → Recordatorios: los avisos de Astia que llegan aunque la app esté cerrada (sin Google Calendar). */
export function PanelAvisos() {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const [ocupado, setOcupado] = useState(false)
  if (!pushConfigurado()) return null

  const activo = ajustes.avisosCerrada?.activo === true && permisoDeAvisos() === 'granted'

  const activar = async () => {
    setOcupado(true)
    const r = await activarAvisos()
    setOcupado(false)
    if (r === 'ok') {
      cambiar({ avisosCerrada: { activo: true } })
      avisar('Listo. Toca "Enviar aviso de prueba" y cierra Astia para comprobar que llega.', 'ok', { duracion: 7000 })
    } else if (r === 'no-instalada') avisar('Primero instala Astia en tu pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde ahí.', 'error', { duracion: 9000 })
    else if (r === 'denegado') avisar('El permiso de notificaciones está bloqueado. Actívalo en Ajustes del iPhone → Notificaciones → Astia.', 'error', { duracion: 9000 })
    else if (r === 'no-soportado') avisar('Este dispositivo no permite avisos con la app cerrada (en iPhone hace falta iOS 16.4 o más).', 'error', { duracion: 8000 })
    else avisar('No se pudo activar. Revisa tu internet e inténtalo otra vez.', 'error')
  }

  const probar = async () => {
    setOcupado(true)
    const ok = await enviarAvisoDePrueba()
    setOcupado(false)
    avisar(ok ? 'Aviso enviado. Si Astia está abierta no lo verás: cierra la app y vuelve a probar.' : 'El servidor no pudo enviarlo. Revisa tu internet o vuelve a activar los avisos.', ok ? 'ok' : 'error', { duracion: 7000 })
  }

  const apagar = async () => {
    setOcupado(true)
    await desactivarAvisos()
    setOcupado(false)
    cambiar({ avisosCerrada: { activo: false } })
    avisar('Avisos con la app cerrada apagados.')
  }

  return (
    <div className="campo">
      <span className="etiqueta">Avisos con la app cerrada</span>
      {!pushSoportado() ? (
        <p className="nota">Este navegador no permite avisos con la app cerrada.</p>
      ) : activo ? (
        <>
          <div className="acciones">
            <button className="btn suave" disabled={ocupado} onClick={() => void probar()}>Enviar aviso de prueba</button>
            <button className="btn suave" disabled={ocupado} onClick={() => void apagar()}>Apagar</button>
          </div>
          <p className="nota">Tus recordatorios te llegarán como notificación aunque cierres Astia. En iPhone no está garantizado: si algún día no llega, avísame.</p>
        </>
      ) : (
        <>
          <button className="btn" disabled={ocupado} onClick={() => void activar()}>Activar avisos con la app cerrada</button>
          <p className="nota">{esAppInstalada() ? 'Se te pedirá permiso para mandarte notificaciones.' : 'Para usarlos, instala Astia en tu pantalla de inicio y ábrela desde ahí.'}</p>
        </>
      )}
    </div>
  )
}
