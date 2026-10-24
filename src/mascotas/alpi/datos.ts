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

/** Ropa y accesorios que se pueden quitar o poner en el vestidor, y en qué niveles existen. */
export const ACCESORIOS_ALPI: { id: string; nombre: string; niveles: NivelAlpi[] }[] = [
  { id: 'chullo', nombre: 'Chullo', niveles: [2] },
  { id: 'bufanda', nombre: 'Bufanda', niveles: [2, 3] },
  { id: 'morral', nombre: 'Morral', niveles: [2] },
  { id: 'baston', nombre: 'Bastón', niveles: [2] },
  { id: 'chaqueta', nombre: 'Chaqueta', niveles: [3] },
  { id: 'baston3', nombre: 'Bastón', niveles: [3] },
  { id: 'mochila', nombre: 'Mochila', niveles: [3, 4] },
  { id: 'corona', nombre: 'Corona', niveles: [4] },
  { id: 'capa', nombre: 'Capa', niveles: [4] },
  { id: 'baston4', nombre: 'Bastón elemental', niveles: [4] },
]

/** Cómo viene Alpi de fábrica (el bastón del nivel 2 empieza guardado). */
export const ACCESORIOS_INICIALES: Record<string, boolean> = {
  chullo: true, bufanda: true, morral: true, baston: false, chaqueta: true, baston3: true, mochila: true, corona: true, capa: true, baston4: true,
}
