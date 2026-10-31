import { useEffect, useRef } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { borrarEventoRecordatorio, calendarioConfigurado, calendarioConectado, conectarCalendario } from '../calendario/google'
import { useDatos } from '../datos/DatosProvider'
import { fraseDeAviso } from '../lib/recordatorios'
import { avisosDeRecordatorios } from '../notificaciones/avisos'
import { pushConfigurado, sincronizarAvisos } from '../notificaciones/push'
import { sonar } from '../sonidos/reproductor'
import { decirRecordatorio } from '../sonidos/voz'
import { useAviso } from '../ui/Aviso'

const SIETE_DIAS = 7 * 24 * 3_600_000

/**
 * Vigila los recordatorios: cuando llega la hora suena, muestra el aviso y Alpi lo dice en voz alta.
 * Si la app estaba cerrada o en segundo plano, al volver avisa de lo que se pasó. También borra de Google Calendar
 * los eventos que ya pasaron. No dibuja nada.
 */
export function MotorRecordatorios() {
  const { recordatorios, guardarRecordatorio, borrarRecordatorio } = useDatos()
  const { ajustes } = useAjustes()
  const avisar = useAviso()
  const ultimo = useRef({ recordatorios, ajustes, guardarRecordatorio, borrarRecordatorio, avisar })
  ultimo.current = { recordatorios, ajustes, guardarRecordatorio, borrarRecordatorio, avisar }
  const limpiando = useRef(false)

  // Con los avisos de la app cerrada activos, el servidor recibe la lista actualizada cada vez que cambian los recordatorios
  const conAvisos = ajustes.avisosCerrada?.activo === true
  useEffect(() => {
    if (!conAvisos || !pushConfigurado()) return
    const espera = window.setTimeout(() => void sincronizarAvisos(avisosDeRecordatorios(recordatorios, Date.now())), 1500)
    return () => window.clearTimeout(espera)
  }, [conAvisos, recordatorios])

  useEffect(() => {
    const revisar = () => {
      const { recordatorios: lista, ajustes: aj, guardarRecordatorio: guardar, borrarRecordatorio: borrar, avisar: mostrar } = ultimo.current
      const ahora = Date.now()
      for (const r of lista) {
        const hora = Date.parse(r.cuando)
        if (Number.isNaN(hora)) continue
        if (!r.avisado && hora <= ahora) {
          guardar({ ...r, avisado: true })
          const tarde = Math.round((ahora - hora) / 60_000)
          const frase = tarde >= 2 ? `Se te pasó, hace ${tarde} min: ${r.texto}` : fraseDeAviso(aj.nombre, r.texto)
          mostrar(frase, 'ok', { duracion: 20_000, accion: 'Listo' })
          void sonar('recordatorio')
          decirRecordatorio(frase)
        } else if (r.avisado && hora < ahora - SIETE_DIAS) {
          borrar(r.id)
        }
      }
      // Los eventos de Google Calendar ya cumplidos se borran (solo los que creó Astia)
      const porBorrar = lista.filter((r) => r.avisado && r.calendarioId && Date.parse(r.cuando) + 120_000 < ahora)
      if (porBorrar.length && calendarioConfigurado() && !limpiando.current) {
        limpiando.current = true
        void (async () => {
          try {
            if (!calendarioConectado() && !(await conectarCalendario(false))) return
            for (const r of porBorrar) if (r.calendarioId && (await borrarEventoRecordatorio(r.calendarioId))) guardar({ ...r, calendarioId: undefined })
          } finally {
            limpiando.current = false
          }
        })()
      }
    }
    const id = window.setInterval(revisar, 1000)
    const alVolver = () => !document.hidden && revisar()
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', revisar)
    revisar()
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', revisar)
    }
  }, [])

  return null
}
