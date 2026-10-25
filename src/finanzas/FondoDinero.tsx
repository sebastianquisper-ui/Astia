import { useMemo } from 'react'

// El fondo de Finanstia: en vez de estrellas, billetes de soles estilizados que suben despacio (como el cielo de Astia).
// No son los billetes reales, solo dibujos con sus colores aproximados.

const COLORES = ['#d9822b', '#9b6b43', '#7d5bb0', '#3b78b8', '#c9902a']
const VALORES = ['10', '20', '50', '100', '200']

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

/** Un billete dibujado. `valor` es el número que lleva escrito. */
export function Billete({ color, valor, className = '', style }: { color: string; valor: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={'billete ' + className} style={style} viewBox="0 0 120 56" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="118" height="54" rx="7" fill={color} />
      <rect x="6" y="6" width="108" height="44" rx="4" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.4" />
      <circle cx="30" cy="28" r="13" fill="#fff" fillOpacity="0.28" />
      <circle cx="30" cy="28" r="8" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.2" />
      <path d="M52 20h46M52 28h38M52 36h46" stroke="#fff" strokeOpacity="0.4" strokeWidth="2.4" strokeLinecap="round" />
      <text x="108" y="16" textAnchor="end" fontSize="11" fontWeight="800" fill="#fff" fillOpacity="0.9" fontFamily="inherit">{valor}</text>
    </svg>
  )
}

export function FondoDinero() {
  const billetes = useMemo(() => {
    const r = aleatorio(31)
    return Array.from({ length: 11 }, (_, i) => ({
      i,
      izq: r() * 92,
      ancho: 52 + r() * 46,
      dur: 38 + r() * 40,
      retraso: -r() * 70,
      giro: -25 + r() * 50,
      color: COLORES[i % COLORES.length],
      valor: VALORES[i % VALORES.length],
    }))
  }, [])
  return (
    <div className="cielo fondo-dinero" aria-hidden="true">
      {billetes.map((b) => (
        <Billete
          key={b.i}
          color={b.color}
          valor={b.valor}
          className="billete-flota"
          style={{ left: `${b.izq}vw`, width: b.ancho, animationDuration: `${b.dur}s`, animationDelay: `${b.retraso}s`, ['--giro' as string]: `${b.giro}deg` }}
        />
      ))}
    </div>
  )
}
