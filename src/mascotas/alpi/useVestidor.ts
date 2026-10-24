import { useAjustes } from '../../ajustes/AjustesProvider'
import { useDatos } from '../../datos/DatosProvider'
import { ymd } from '../../lib/fechas'
import { useMascota } from '../useMascota'
import { ACCESORIOS_INICIALES, nivelAlpi, type ExpresionAlpi, type NivelAlpi } from './datos'

/**
 * El vestidor de Alpi. Se desbloquea solo cuando no te queda nada pendiente para hoy
 * (ni vencido): primero cumples, después juegas.
 */
export function useVestidor() {
  const { ajustes, cambiar } = useAjustes()
  const { tareas } = useDatos()
  const { mascota, estado } = useMascota()
  const alcanzado = nivelAlpi(mascota?.id === 'alpi' && estado ? estado.indice + 1 : 1)
  const look = ajustes.alpiLook ?? {}
  const nivel = nivelAlpi(Math.min(look.nivel ?? alcanzado, alcanzado)) as NivelAlpi
  const accesorios = { ...ACCESORIOS_INICIALES, ...(look.accesorios ?? {}) }
  const hoy = ymd(new Date())
  const faltan = tareas.filter((t) => t.estado === 'pendiente' && t.fecha <= hoy).length
  const desbloqueado = faltan === 0
  return {
    alcanzado,
    nivel,
    accesorios,
    faltan,
    desbloqueado,
    /** La expresión que elegiste a mano. Solo vale mientras no te quede nada pendiente. */
    expresion: desbloqueado ? look.expresion : undefined,
    elegirExpresion: (e: ExpresionAlpi | null) => cambiar({ alpiLook: { ...look, expresion: e ?? undefined } }),
    elegirNivel: (n: number) => cambiar({ alpiLook: { ...look, nivel: n } }),
    alternarAccesorio: (id: string) => cambiar({ alpiLook: { ...look, accesorios: { ...accesorios, [id]: !accesorios[id] } } }),
    restablecer: () => cambiar({ alpiLook: {} }),
  }
}
