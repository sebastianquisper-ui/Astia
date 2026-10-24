import type { Animo } from '../../lib/avatar'

// Todo lo que define a Alpi: sus 4 niveles, sus expresiones y sus movimientos.
// El modelo 3D (Modelo.tsx) y la pantalla de prueba (EstudioAlpi.tsx) leen de aquí.

export type NivelAlpi = 1 | 2 | 3 | 4

export interface DatosNivel {
  nivel: NivelAlpi
  nombre: string
  lema: string
  /** Fondo del nivel (degradado de arriba a abajo) y su color de acento. */
  fondo: [string, string]
  acento: string
  /** Qué lleva puesto, para mostrarlo en la ficha. */
  accesorios: string
}

export const NIVELES_ALPI: DatosNivel[] = [
  { nivel: 1, nombre: 'Alpaca bebé', lema: 'Comienza su aventura contigo.', fondo: ['#ffe6ee', '#ffd3df'], acento: '#e0557a', accesorios: 'Pañuelo rojo, bastón de caminante y mochila sencilla' },
  { nivel: 2, nombre: 'Exploradora', lema: 'Descubre nuevos hábitos y crece con cada logro.', fondo: ['#fff4d6', '#ffe5b0'], acento: '#c9762e', accesorios: 'Mochila de viaje con plantas y pañuelo coral' },
  { nivel: 3, nombre: 'Guardiana de los valles', lema: 'Se vuelve más segura, valiente y muy especial.', fondo: ['#e3f6e6', '#c9ecd2'], acento: '#3f9a63', accesorios: 'Corona de flores silvestres y poncho verde' },
  { nivel: 4, nombre: 'Alpaca legendaria', lema: 'Una compañera legendaria que celebra todos tus sueños.', fondo: ['#efe6ff', '#dccbff'], acento: '#7b5ccf', accesorios: 'Capa elegante, medalla dorada y brillo estelar' },
]

export type ExpresionAlpi = 'feliz' | 'emocionada' | 'curiosa' | 'dormida' | 'concentrada' | 'sorprendida' | 'triste' | 'guino'

export const EXPRESIONES_ALPI: { id: ExpresionAlpi; nombre: string; cuando: string }[] = [
  { id: 'feliz', nombre: 'Feliz', cuando: 'Completaste una meta' },
  { id: 'emocionada', nombre: 'Emocionada', cuando: 'Subió de nivel' },
  { id: 'curiosa', nombre: 'Curiosa', cuando: 'Te está mirando' },
  { id: 'dormida', nombre: 'Dormida', cuando: 'Es de noche' },
  { id: 'concentrada', nombre: 'Concentrada', cuando: 'Sesión de estudio' },
  { id: 'sorprendida', nombre: 'Sorprendida', cuando: 'Hay algo vencido' },
  { id: 'triste', nombre: 'Triste', cuando: 'Día difícil' },
  { id: 'guino', nombre: 'Guiño', cuando: 'Para animarte' },
]

export type AnimacionAlpi = 'reposo' | 'caminar' | 'saltar' | 'celebrar' | 'estudiando' | 'descansando' | 'saludar'

export const ANIMACIONES_ALPI: { id: AnimacionAlpi; nombre: string }[] = [
  { id: 'reposo', nombre: 'Reposo' },
  { id: 'caminar', nombre: 'Caminar' },
  { id: 'saltar', nombre: 'Saltar' },
  { id: 'celebrar', nombre: 'Celebrar' },
  { id: 'estudiando', nombre: 'Estudiando' },
  { id: 'descansando', nombre: 'Descansando' },
  { id: 'saludar', nombre: 'Saludar' },
]

/** Paleta oficial: lana crema, rosado, verde menta, café y dorado. */
export const PALETA_ALPI = [
  { nombre: 'Lana', color: '#fbf1e4' },
  { nombre: 'Rosado', color: '#f7a8a8' },
  { nombre: 'Menta', color: '#8fcfb4' },
  { nombre: 'Café', color: '#8a5a3c' },
  { nombre: 'Dorado', color: '#e9b949' },
] as const

export const nivelAlpi = (n: number): NivelAlpi => Math.max(1, Math.min(4, Math.round(n))) as NivelAlpi

/**
 * Cómo se ve Alpi según el ánimo de Astia en la app.
 * Tocarla la hace saltar emocionada; de noche descansa sobre su tronco.
 */
export function desdeAnimo(animo: Animo, opciones: { tocada?: boolean; fiesta?: boolean } = {}): { expresion: ExpresionAlpi; animacion: AnimacionAlpi } {
  if (opciones.tocada) return { expresion: 'emocionada', animacion: 'saltar' }
  if (opciones.fiesta) return { expresion: 'emocionada', animacion: 'celebrar' }
  switch (animo) {
    case 'durmiendo':
      return { expresion: 'dormida', animacion: 'descansando' }
    case 'alerta':
      return { expresion: 'sorprendida', animacion: 'reposo' }
    case 'contenta':
      return { expresion: 'feliz', animacion: 'saludar' }
    default:
      return { expresion: 'curiosa', animacion: 'reposo' }
  }
}

/** Efecto de texto que acompaña a cada estado (zzz, ?, !, corazones, chispas). */
export function efectoDe(expresion: ExpresionAlpi, animacion: AnimacionAlpi): 'zzz' | 'pregunta' | 'exclama' | 'corazones' | 'chispas' | null {
  if (expresion === 'dormida' || animacion === 'descansando') return 'zzz'
  if (animacion === 'celebrar') return 'chispas'
  if (expresion === 'curiosa') return 'pregunta'
  if (expresion === 'sorprendida') return 'exclama'
  if (expresion === 'emocionada') return 'corazones'
  return null
}
