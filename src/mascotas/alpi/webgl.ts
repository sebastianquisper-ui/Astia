let webgl: boolean | undefined

/** ¿Este teléfono puede dibujar 3D? Si no, se usa la Alpi dibujada en vectores. */
export function hayWebGL(): boolean {
  if (webgl !== undefined) return webgl
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webgl = false
  }
  return webgl
}
