import { useMemo } from 'react'

// Fondo de la app: cielo estrellado (de noche) o cielo suave (de día).
// Las estrellas se generan una vez con una semilla fija: siempre quedan en el mismo sitio.

function aleatorio(semilla: number) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sombras(n: number, semilla: number, radio: number) {
  const r = aleatorio(semilla)
  return Array.from({ length: n }, () => `${(r() * 100).toFixed(1)}vw ${(r() * 100).toFixed(1)}vh 0 ${radio * (0.4 + r() * 0.6)}px currentColor`).join(',')
}

export function Cielo() {
  const chicas = useMemo(() => sombras(70, 7, 0.9), [])
  const medias = useMemo(() => sombras(16, 21, 1.6), [])
  const titilan = useMemo(() => sombras(14, 99, 1.3), [])
  return (
    <div className="cielo" aria-hidden="true">
      <div className="estrellas e1" style={{ boxShadow: chicas }} />
      <div className="estrellas e2" style={{ boxShadow: medias }} />
      <div className="estrellas e3" style={{ boxShadow: titilan }} />
    </div>
  )
}
