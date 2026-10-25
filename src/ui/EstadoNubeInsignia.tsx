import { useEffect, useState } from 'react'
import { useDatos } from '../datos/DatosProvider'

const TEXTO = {
  local: { texto: 'Solo en este teléfono', ayuda: 'Tus datos de estudios están en este teléfono' },
  conectando: { texto: 'Conectando…', ayuda: 'Trayendo tus datos de tu cuenta' },
  'al-dia': { texto: 'Guardado en tu cuenta', ayuda: 'Tus datos de estudios están guardados en tu cuenta de Google y en este teléfono' },
  error: { texto: 'Sin sincronizar', ayuda: 'No se pudo guardar en tu cuenta. Tus datos siguen a salvo en este teléfono; se reintenta solo.' },
} as const

/** El estado de la copia en la nube, en la cabecera de estudios. */
export function EstadoNubeInsignia() {
  const { nube } = useDatos()
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)
  useEffect(() => {
    const cambiar = () => setEnLinea(navigator.onLine)
    window.addEventListener('online', cambiar)
    window.addEventListener('offline', cambiar)
    return () => (window.removeEventListener('online', cambiar), window.removeEventListener('offline', cambiar))
  }, [])
  const e = nube === 'guardando' ? (enLinea ? { texto: 'Guardando…', ayuda: 'Subiendo tus cambios a tu cuenta' } : { texto: 'Se subirá con internet', ayuda: 'Estás sin conexión: tus cambios están en este teléfono y suben solos cuando vuelva el internet' }) : TEXTO[nube]
  return (
    <div className={'estado' + (nube === 'error' ? ' estado-error' : '')} title={e.ayuda}>
      <i /> {e.texto}
    </div>
  )
}
