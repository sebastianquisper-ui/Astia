import { guardarLocal, leerLocal } from './almacen'

// Cada sesión de estudio que haces queda anotada en este teléfono (hora, método y si la terminaste).
// Sirve para que Astia aprenda a qué hora rindes más y qué método te funciona.

export interface RegistroSesion {
  /** Cuándo empezaste (ISO). */
  inicio: string
  metodo: string
  tareaId?: string
  /** Minutos de enfoque que hiciste. */
  enfoqueMin: number
  /** Llegaste hasta el final de la sesión. */
  completa: boolean
}

const CLAVE = 'astia.sesiones'
const MAX = 300

export const leerSesiones = () => leerLocal<RegistroSesion[]>(CLAVE, [])

/** Las sesiones sin minutos de enfoque no se anotan (abrir y cerrar al instante no cuenta). */
export function registrarSesion(r: RegistroSesion): boolean {
  if (r.enfoqueMin <= 0) return false
  return guardarLocal(CLAVE, [r, ...leerSesiones()].slice(0, MAX))
}
