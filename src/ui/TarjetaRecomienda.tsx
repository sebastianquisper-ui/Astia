import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { usePlata } from '../finanzas/usePlata'
import { recomendar, type Energia, type EstadoPlata } from '../lib/recomendaciones'
import { resumenDeSueno } from '../lib/sueno'
import { useEnergia } from '../lib/useEnergia'
import { useSueno } from '../lib/useSueno'
import { useSesion } from '../sesion/useSesion'
import { Icono } from './Icono'
import { useAhora } from './useAhora'

const ENERGIAS: { id: Energia; texto: string }[] = [
  { id: 'baja', texto: 'Sin energía' },
  { id: 'normal', texto: 'Normal' },
  { id: 'alta', texto: 'Con ganas' },
]

/**
 * "Astia te recomienda": cruza estudio, hábitos, tu ánimo de hoy y (si lo permites) tu plata.
 * `plata` solo la pasa Finanstia, donde ya pusiste el PIN; en las demás pantallas depende de Ajustes.
 */
export function TarjetaRecomienda({ plata }: { plata?: EstadoPlata }) {
  const { ajustes } = useAjustes()
  const { tareas, cursos, habitos, progreso } = useDatos()
  const ahora = useAhora()
  const [energia, elegirEnergia] = useEnergia(ahora)
  const plataPermitida = usePlata(plata === undefined && ajustes.plataEnHoy === true)
  const sesion = useSesion()
  const { registros } = useSueno(ahora)

  const recomendaciones = recomendar({ ahora, tareas, cursos, habitos, progreso, energia, plata: plata ?? plataPermitida, sueno: resumenDeSueno(registros, ahora) })
  if (tareas.length === 0 && habitos.length === 0) return null

  return (
    <section className="seccion recomienda" aria-label="Astia te recomienda">
      <h2 className="titulo">Astia te recomienda</h2>
      <div className="campo">
        <span className="etiqueta" id="rc-energia">¿Cómo estás hoy?</span>
        <div className="seg" role="group" aria-labelledby="rc-energia">
          {ENERGIAS.map((e) => (
            <button key={e.id} aria-pressed={energia === e.id} onClick={() => elegirEnergia(energia === e.id ? null : e.id)}>
              {e.texto}
            </button>
          ))}
        </div>
      </div>
      {recomendaciones.length === 0 ? (
        <p className="nota">Cuando tengas tareas o hábitos, aquí te digo qué conviene hacer.</p>
      ) : (
        <div className="lista">
          {recomendaciones.map((r) => (
            <div key={r.id} className="fila">
              <span className="texto">
                <b>{r.titulo}</b>
                <span>{r.detalle}</span>
              </span>
              {r.metodo && r.tareaId && (
                <button className="icono-btn" aria-label={`Empezar: ${r.titulo}`} onClick={() => sesion.iniciar(r.metodo!, r.tareaId)}>
                  <Icono nombre="play" tam={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {sesion.nodo}
    </section>
  )
}
