import type { ReactNode } from 'react'
import type { Animo } from '../../lib/avatar'
import type { Contexto } from './tipos'

// Piezas que usan todas las mascotas: sombreado, ojos, boca, mejillas y chispas.

export const idDe = (c: Contexto, nombre: string) => `${c.id}-${nombre}`
export const ref = (c: Contexto, nombre: string) => `url(#${idDe(c, nombre)})`

/** Degradado redondo con la luz arriba a la izquierda (se ve como volumen suave). */
export function Grad({ id, luz, base, sombra, cx = 0.36, cy = 0.28, r = 0.95 }: { id: string; luz: string; base: string; sombra: string; cx?: number; cy?: number; r?: number }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r}>
      <stop offset="0" stopColor={luz} />
      <stop offset="0.55" stopColor={base} />
      <stop offset="1" stopColor={sombra} />
    </radialGradient>
  )
}

/** Un brillo blanco que se apaga hacia afuera (para el reflejo de la luz). */
export function Brillo({ id, opacidad = 0.6 }: { id: string; opacidad?: number }) {
  return (
    <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#fff" stopOpacity={opacidad} />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </radialGradient>
  )
}

/** Una chispa de cuatro puntas que titila. */
export function Chispa({ x, y, s = 7, color = '#ffe27a', retraso = 0 }: { x: number; y: number; s?: number; color?: string; retraso?: number }) {
  const k = s * 0.22
  return (
    <path
      className="r-chispa"
      style={{ animationDelay: `${retraso}s` }}
      d={`M ${x} ${y - s} Q ${x + k} ${y - k} ${x + s} ${y} Q ${x + k} ${y + k} ${x} ${y + s} Q ${x - k} ${y + k} ${x - s} ${y} Q ${x - k} ${y - k} ${x} ${y - s} Z`}
      fill={color}
    />
  )
}

/** Una flor de cinco pétalos. */
export function Flor({ x, y, s = 10, petalo = '#ff9bb8', centro = '#ffd35a', giro = 0 }: { x: number; y: number; s?: number; petalo?: string; centro?: string; giro?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={-s * 0.62} rx={s * 0.42} ry={s * 0.52} fill={petalo} transform={`rotate(${a})`} />
      ))}
      <circle r={s * 0.34} fill={centro} />
    </g>
  )
}

interface CaraProps {
  animo: Animo
  habla: boolean
  /** Centro de la cara y altura de los ojos. */
  x: number
  y: number
  /** Distancia del centro a cada ojo. */
  sep: number
  /** Tamaño de los ojos. */
  r: number
  estilo?: 'brillante' | 'punto'
  tinta?: string
  /** Color de las mejillas (si no hay, no se dibujan). */
  mejilla?: string
  /** Altura de la boca bajo los ojos y su ancho. */
  bocaY?: number
  bocaAncho?: number
  /** Gato: boca en "w" (con una nariz que se pasa como hijo). */
  boca?: 'u' | 'w' | 'ninguna'
  cejas?: boolean
  /** Si es true, en reposo tiene los ojos entrecerrados (como Nube). */
  dormilon?: boolean
  children?: ReactNode
}

/**
 * La cara de una mascota. Cambia según el ánimo, igual que la estrella:
 * seria (cejas firmes), alerta (ojos grandes y cejas más duras), contenta (ojos felices y sonrisa),
 * durmiendo (ojos cerrados) y hablando (la boca se abre y se cierra).
 */
export function Cara(p: CaraProps) {
  const { animo, habla } = p
  const tinta = p.tinta ?? '#2c2230'
  const t = p.r
  const w = p.bocaAncho ?? t * 0.9
  const by = p.y + (p.bocaY ?? t * 2.7)
  const cerrados = animo === 'durmiendo' || (p.dormilon && animo === 'seria')
  const k = animo === 'alerta' ? 1.18 : 1

  const ojo = (lado: -1 | 1) => {
    const cx = p.x + lado * p.sep
    if (animo === 'contenta') return <path key={lado} d={`M ${cx - t} ${p.y + t * 0.3} Q ${cx} ${p.y - t * 1.25} ${cx + t} ${p.y + t * 0.3}`} stroke={tinta} strokeWidth={t * 0.45} strokeLinecap="round" fill="none" />
    if (cerrados) return <path key={lado} d={`M ${cx - t} ${p.y - t * 0.15} Q ${cx} ${p.y + t * 1.05} ${cx + t} ${p.y - t * 0.15}`} stroke={tinta} strokeWidth={t * 0.42} strokeLinecap="round" fill="none" />
    if (p.estilo === 'punto') {
      return (
        <g key={lado} className="ojo">
          <ellipse cx={cx} cy={p.y} rx={t * 0.62 * k} ry={t * 0.76 * k} fill={tinta} />
          <circle cx={cx - t * 0.2} cy={p.y - t * 0.28} r={t * 0.22} fill="#fff" />
        </g>
      )
    }
    return (
      <g key={lado} className="ojo">
        <ellipse cx={cx} cy={p.y} rx={t * 0.92 * k} ry={t * 1.14 * k} fill={tinta} />
        <circle cx={cx - t * 0.3} cy={p.y - t * 0.4} r={t * 0.38} fill="#fff" />
        <circle cx={cx + t * 0.34} cy={p.y + t * 0.42} r={t * 0.17} fill="#fff" opacity="0.85" />
      </g>
    )
  }

  // Cejas: inclinadas hacia el centro = firmes. Más inclinadas = alerta.
  const ceja = (lado: -1 | 1) => {
    const cx = p.x + lado * p.sep
    const caida = animo === 'alerta' ? 1 : 0.5
    const yAlta = p.y - t * 2.1
    return <line key={lado} x1={cx + lado * t} y1={yAlta} x2={cx - lado * t} y2={yAlta + caida * t * 0.9} stroke={tinta} strokeWidth={t * 0.4} strokeLinecap="round" />
  }

  let bocaDibujo: ReactNode
  if (p.boca === 'ninguna') {
    bocaDibujo = null
  } else if (habla) {
    bocaDibujo = (
      <g className="boca-habla" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <ellipse cx={p.x} cy={by + w * 0.2} rx={w * 0.72} ry={w * 0.6} fill={tinta} />
        <ellipse cx={p.x} cy={by + w * 0.45} rx={w * 0.4} ry={w * 0.22} fill="#ff8da1" />
      </g>
    )
  } else if (animo === 'contenta') {
    bocaDibujo = (
      <g>
        <path d={`M ${p.x - w} ${by - w * 0.2} Q ${p.x} ${by + w * 2} ${p.x + w} ${by - w * 0.2} Z`} fill={tinta} stroke={tinta} strokeWidth={t * 0.2} strokeLinejoin="round" />
        <ellipse cx={p.x} cy={by + w * 0.85} rx={w * 0.5} ry={w * 0.3} fill="#ff8da1" />
      </g>
    )
  } else if (animo === 'durmiendo') {
    bocaDibujo = <path d={`M ${p.x - w * 0.4} ${by} Q ${p.x} ${by + w * 0.55} ${p.x + w * 0.4} ${by}`} stroke={tinta} strokeWidth={t * 0.34} strokeLinecap="round" fill="none" />
  } else if (p.boca === 'w') {
    bocaDibujo = (
      <path
        d={`M ${p.x} ${by - w * 0.3} Q ${p.x - w * 0.55} ${by + w * 0.8} ${p.x - w} ${by + w * 0.05} M ${p.x} ${by - w * 0.3} Q ${p.x + w * 0.55} ${by + w * 0.8} ${p.x + w} ${by + w * 0.05}`}
        stroke={tinta}
        strokeWidth={t * 0.36}
        strokeLinecap="round"
        fill="none"
      />
    )
  } else if (animo === 'alerta') {
    bocaDibujo = <path d={`M ${p.x - w * 0.7} ${by + w * 0.1} Q ${p.x - w * 0.25} ${by - w * 0.15} ${p.x} ${by + w * 0.1} Q ${p.x + w * 0.25} ${by + w * 0.35} ${p.x + w * 0.7} ${by + w * 0.1}`} stroke={tinta} strokeWidth={t * 0.36} strokeLinecap="round" fill="none" />
  } else {
    bocaDibujo = <path d={`M ${p.x - w * 0.8} ${by} Q ${p.x} ${by + w * 0.7} ${p.x + w * 0.8} ${by}`} stroke={tinta} strokeWidth={t * 0.36} strokeLinecap="round" fill="none" />
  }

  return (
    <g>
      {p.mejilla && (
        <>
          <ellipse cx={p.x - p.sep - t * 1.5} cy={p.y + t * 1.6} rx={t * 1.2} ry={t * 0.78} fill={p.mejilla} opacity={animo === 'contenta' ? 0.85 : 0.6} />
          <ellipse cx={p.x + p.sep + t * 1.5} cy={p.y + t * 1.6} rx={t * 1.2} ry={t * 0.78} fill={p.mejilla} opacity={animo === 'contenta' ? 0.85 : 0.6} />
        </>
      )}
      {ojo(-1)}
      {ojo(1)}
      {p.cejas && (animo === 'seria' || animo === 'alerta') && !cerrados && (
        <>
          {ceja(-1)}
          {ceja(1)}
        </>
      )}
      {p.children}
      {bocaDibujo}
    </g>
  )
}
