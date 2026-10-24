import { useMemo } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { calcularXP, estadoDe, mascotaPorId, totalXP, type EstadoMascota, type Mascota, type XP } from '../lib/mascotas'

export interface MascotaActual {
  /** La mascota elegida, o null si usas la estrella de siempre. */
  mascota: Mascota | null
  estado: EstadoMascota | null
  xp: XP
  total: number
}

/** La mascota que elegiste, en qué etapa está y tu XP (todo calculado de lo que haces en la app). */
export function useMascota(): MascotaActual {
  const { ajustes } = useAjustes()
  const { tareas, habitos, rutinas, progreso } = useDatos()
  const xp = useMemo(() => calcularXP({ tareas, habitos, rutinas, progreso }), [tareas, habitos, rutinas, progreso])
  // Si habías elegido una mascota que ya no existe, te acompaña Alpi.
  const mascota = ajustes.mascota === 'astia' ? null : (mascotaPorId(ajustes.mascota) ?? mascotaPorId('alpi') ?? null)
  return { mascota, estado: mascota ? estadoDe(mascota, xp) : null, xp, total: totalXP(xp) }
}
