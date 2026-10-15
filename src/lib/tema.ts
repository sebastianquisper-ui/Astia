// Lógica del tema y del tamaño de letra. Son funciones puras: fáciles de probar.

export type ModoTema = 'hora' | 'claro' | 'oscuro'
export type TemaEfectivo = 'light' | 'dark'
export type TamanoLetra = 'normal' | 'grande' | 'muy-grande'

/** "hora" = claro de día y oscuro de noche (6:30 a 18:30), igual que en la v1. */
export function temaEfectivo(modo: ModoTema, ahora: Date = new Date()): TemaEfectivo {
  if (modo === 'claro') return 'light'
  if (modo === 'oscuro') return 'dark'
  const h = ahora.getHours() + ahora.getMinutes() / 60
  return h >= 6.5 && h < 18.5 ? 'light' : 'dark'
}

export const ESCALA_LETRA: Record<TamanoLetra, number> = {
  normal: 1,
  grande: 1.15,
  'muy-grande': 1.3,
}

/** Color de la barra del sistema (iPhone/Android) para que combine con el tema. */
export const COLOR_BARRA: Record<TemaEfectivo, string> = {
  light: '#E7EAEE',
  dark: '#1F2230',
}
