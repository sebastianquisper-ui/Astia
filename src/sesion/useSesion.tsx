import { useCallback, useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { FASE_ARRANQUE, fasesDe, metodoPorId, sugerirMetodo, type MetodoId } from '../lib/metodos'
import { useAviso } from '../ui/Aviso'
import { SesionEstudio } from './SesionEstudio'
import { prepararSonido } from './sonido'

/**
 * Para iniciar una sesión guiada desde cualquier pantalla.
 * Uso: const { iniciar, nodo } = useSesion()  →  iniciar('pomodoro', tareaId?)  y pon {nodo} en la pantalla.
 * `'arranque'` es "Solo 10 minutos para arrancar".
 */
export function useSesion() {
  const { tareas, cursos, perfil, alternar } = useDatos()
  const avisar = useAviso()
  const [sesion, setSesion] = useState<{ metodo: MetodoId | 'arranque'; tareaId?: string; clave: number } | null>(null)

  const iniciar = useCallback((metodo: MetodoId | 'arranque', tareaId?: string) => {
    prepararSonido() // el sonido solo se permite después de tocar la pantalla
    setSesion((previa) => ({ metodo, tareaId, clave: (previa?.clave ?? 0) + 1 }))
  }, [])
  const cerrar = useCallback(() => setSesion(null), [])

  let nodo = null
  if (sesion) {
    const tarea = sesion.tareaId ? tareas.find((t) => t.id === sesion.tareaId) : undefined
    const curso = cursos.find((c) => c.id === tarea?.cursoId)
    const cfg = { enfoqueMin: perfil.enfoqueMin, descansoMin: perfil.descansoMin }
    const m = sesion.metodo
    const esArranque = m === 'arranque'
    const sugerido: MetodoId = tarea ? sugerirMetodo(tarea, curso?.nombre) : 'pomodoro'
    nodo = (
      <SesionEstudio
        key={sesion.clave}
        titulo={m === 'arranque' ? 'Solo 10 minutos' : metodoPorId(m).nombre}
        fases={m === 'arranque' ? [FASE_ARRANQUE] : fasesDe(m, cfg)}
        tarea={tarea}
        esPomodoro={m === 'pomodoro'}
        esArranque={esArranque}
        descansoMin={perfil.descansoMin}
        siguiente={esArranque ? { nombre: metodoPorId(sugerido).nombre, alSeguir: () => iniciar(sugerido, sesion.tareaId) } : undefined}
        alMarcarHecha={
          tarea && tarea.estado === 'pendiente'
            ? () => {
                alternar(tarea.id)
                avisar('Hecha. Una menos.')
              }
            : undefined
        }
        alCerrar={cerrar}
      />
    )
  }
  return { iniciar, nodo }
}
