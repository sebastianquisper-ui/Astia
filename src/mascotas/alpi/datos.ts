import type { Animo } from '../../lib/avatar'

// Alpi en 3D es el modelo de src/mascotas/alpi/modelo/alpi-3d.html (sin cambios). La app lo carga
// dentro de un iframe y le manda órdenes: nivel, expresión y acción. Aquí están los nombres que entiende.

export type NivelAlpi = 1 | 2 | 3 | 4
export const nivelAlpi = (n: number): NivelAlpi => Math.max(1, Math.min(4, Math.round(n))) as NivelAlpi

export type ExpresionAlpi =
  | 'normal' | 'feliz' | 'emocionada' | 'curiosa' | 'dormida' | 'concentrada' | 'sorpresa'
  | 'triste' | 'guino' | 'molesta' | 'furiosa' | 'reganona' | 'orgullosa'

export type AccionAlpi = 'saludar' | 'saltar' | 'bailar' | 'risa' | 'explorar'

/**
 * Cómo se pone Alpi según el ánimo de Astia (estricta y directa):
 * si hay algo vencido te regaña, de noche duerme, cuando cumples se pone feliz.
 * `fiesta` es para cuando sube de nivel: se pone orgullosa y baila.
 */
export function desdeAnimo(animo: Animo, opciones: { fiesta?: boolean } = {}): { expresion: ExpresionAlpi; accion?: AccionAlpi } {
  if (opciones.fiesta) return { expresion: 'orgullosa', accion: 'bailar' }
  switch (animo) {
    case 'durmiendo':
      return { expresion: 'dormida' }
    case 'alerta':
      return { expresion: 'reganona' }
    case 'contenta':
      return { expresion: 'feliz', accion: 'saludar' }
    default:
      return { expresion: 'normal' }
  }
}
