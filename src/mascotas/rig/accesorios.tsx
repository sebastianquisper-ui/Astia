import { Chispa, Flor } from './herramientas'

// Accesorios que cambian de una etapa a otra. Todos se colocan por su punto de anclaje.

/** Sombrero de mago con estrellas. (x, y) = centro del borde, justo sobre la cabeza. */
export function Mago({ x, y, s = 1, color = '#7b5ccf', cinta = '#ffd35a' }: { x: number; y: number; s?: number; color?: string; cinta?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -26 0 C -20 -26 -10 -44 8 -64 C 10 -52 20 -26 26 0 Z" fill={color} />
      <path d="M 8 -64 C 18 -66 24 -58 22 -50 C 18 -56 12 -58 8 -64 Z" fill={color} />
      <path d="M -26 0 C -20 -26 -10 -44 8 -64 C 0 -40 -6 -20 -12 0 Z" fill="#fff" opacity="0.18" />
      <ellipse cx="0" cy="1" rx="38" ry="8.5" fill={color} />
      <ellipse cx="0" cy="-1" rx="38" ry="8.5" fill="#fff" opacity="0.12" />
      <path d="M -24 -8 Q 0 0 24 -8 L 25 -1 Q 0 8 -25 -1 Z" fill={cinta} />
      <Chispa x={-6} y={-30} s={5.5} color="#fff3b0" />
      <Chispa x={10} y={-42} s={4} color="#fff3b0" retraso={0.7} />
    </g>
  )
}

/** Sombrero de explorador. */
export function Explorador({ x, y, s = 1, color = '#c98a4b' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="42" ry="9" fill="#a06a35" />
      <path d="M -27 0 C -27 -26 -10 -34 0 -34 C 10 -34 27 -26 27 0 Z" fill={color} />
      <path d="M -27 0 C -27 -22 -14 -32 -4 -34 C -14 -22 -14 -10 -16 0 Z" fill="#fff" opacity="0.2" />
      <path d="M -27 -4 Q 0 4 27 -4 L 27 3 Q 0 11 -27 3 Z" fill="#7a4a22" />
      <circle cx="0" cy="-2" r="3" fill="#ffd35a" />
    </g>
  )
}

/** Lentes redondos. (x, y) = centro entre los dos. */
export function Gafas({ x, y, sep, r, color = '#463a6e' }: { x: number; y: number; sep: number; r: number; color?: string }) {
  return (
    <g fill="#bfe6ff" fillOpacity="0.22" stroke={color} strokeWidth={r * 0.26}>
      <circle cx={x - sep} cy={y} r={r} />
      <circle cx={x + sep} cy={y} r={r} />
      <path d={`M ${x - sep + r} ${y - r * 0.1} Q ${x} ${y - r * 0.55} ${x + sep - r} ${y - r * 0.1}`} fill="none" />
      <path d={`M ${x - sep - r * 0.6} ${y - r * 0.7} l ${r * 0.5} ${-r * 0.2}`} stroke="#fff" strokeOpacity="0.8" strokeLinecap="round" fill="none" />
    </g>
  )
}

/** Gafas de aviador sobre la frente. */
export function Googles({ x, y, sep, r }: { x: number; y: number; sep: number; r: number }) {
  return (
    <g>
      <path d={`M ${x - sep - r * 1.5} ${y} L ${x + sep + r * 1.5} ${y}`} stroke="#6b4a2a" strokeWidth={r * 0.7} strokeLinecap="round" />
      {[-1, 1].map((l) => (
        <g key={l}>
          <circle cx={x + l * sep} cy={y} r={r} fill="#8fd6ff" stroke="#3c2a55" strokeWidth={r * 0.32} />
          <circle cx={x + l * sep - r * 0.3} cy={y - r * 0.3} r={r * 0.28} fill="#fff" opacity="0.85" />
        </g>
      ))}
    </g>
  )
}

/** Bufanda alrededor del cuello. (x, y) = centro del cuello. */
export function Bufanda({ x, y, ancho, color = '#e8545e', cola = true }: { x: number; y: number; ancho: number; color?: string; cola?: boolean }) {
  return (
    <g>
      <path d={`M ${x - ancho} ${y - 6} Q ${x} ${y + 14} ${x + ancho} ${y - 6} L ${x + ancho - 2} ${y + 8} Q ${x} ${y + 26} ${x - ancho + 2} ${y + 8} Z`} fill={color} />
      <path d={`M ${x - ancho * 0.7} ${y + 6} Q ${x} ${y + 17} ${x + ancho * 0.7} ${y + 6}`} stroke="#fff" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      {cola && (
        <g className="r-cola" style={{ transformOrigin: `${x + ancho * 0.5}px ${y + 14}px` }}>
          <path d={`M ${x + ancho * 0.35} ${y + 14} l 14 0 l 4 30 l -16 -4 Z`} fill={color} />
          <path d={`M ${x + ancho * 0.35} ${y + 24} l 15 0`} stroke="#fff" strokeOpacity="0.3" strokeWidth="3" />
        </g>
      )}
    </g>
  )
}

/** Corona. (x, y) = centro de la base. */
export function Corona({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -22 0 L -26 -26 L -11 -12 L 0 -32 L 11 -12 L 26 -26 L 22 0 Z" fill="#ffcf3f" stroke="#e09a1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M -22 -4 L 22 -4" stroke="#e09a1a" strokeWidth="2" />
      <circle cx="0" cy="-11" r="3.4" fill="#ff5a7a" />
      <circle cx="-13" cy="-9" r="2.4" fill="#5ac8ff" />
      <circle cx="13" cy="-9" r="2.4" fill="#5ac8ff" />
      <Chispa x={-18} y={-34} s={4.5} color="#fff" />
    </g>
  )
}

/** Auriculares. (x, y) = centro de la cabeza; ancho = media distancia entre las almohadillas. */
export function Auriculares({ x, y, ancho, color = '#5a6adf' }: { x: number; y: number; ancho: number; color?: string }) {
  return (
    <g>
      <path d={`M ${x - ancho} ${y} C ${x - ancho} ${y - ancho * 0.95} ${x + ancho} ${y - ancho * 0.95} ${x + ancho} ${y}`} stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
      {[-1, 1].map((l) => (
        <g key={l}>
          <rect x={x + l * ancho - 8} y={y - 12} width="16" height="26" rx="8" fill={color} />
          <rect x={x + l * ancho - 4} y={y - 8} width="8" height="18" rx="4" fill="#fff" opacity="0.25" />
        </g>
      ))}
    </g>
  )
}

/** Gorro de dormir con pompón. (x, y) = centro sobre la cabeza. */
export function GorroDormir({ x, y, s = 1, color = '#8a93e8' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -28 2 C -22 -22 -4 -34 24 -22 C 32 -18 36 -6 34 8 C 20 -8 -6 -8 -28 2 Z" fill={color} />
      <path d="M -30 0 Q 0 -8 32 6 L 30 14 Q 0 2 -30 8 Z" fill="#fff" opacity="0.9" />
      <circle className="r-cola" style={{ transformOrigin: '30px 4px' }} cx="38" cy="14" r="7" fill="#fff" />
    </g>
  )
}

/** Corona de flores. (x, y) = centro sobre la cabeza. */
export function CoronaFlores({ x, y, ancho = 36 }: { x: number; y: number; ancho?: number }) {
  const colores = ['#ff9bb8', '#ffd35a', '#fff', '#c7a6ff', '#ff9bb8']
  return (
    <g>
      <path d={`M ${x - ancho} ${y + 8} Q ${x} ${y - 14} ${x + ancho} ${y + 8}`} stroke="#5cae5a" strokeWidth="5" fill="none" strokeLinecap="round" />
      {colores.map((c, i) => {
        const t = i / (colores.length - 1)
        const px = x - ancho + 2 * ancho * t
        const py = y + 8 - Math.sin(Math.PI * t) * 20
        return <Flor key={i} x={px} y={py} s={i % 2 ? 9 : 11} petalo={c} centro={c === '#ffd35a' ? '#fff' : '#ffd35a'} giro={i * 20} />
      })}
    </g>
  )
}

/** Mochila vista de lado detrás del cuerpo. */
export function Mochila({ x, y, ancho, alto, color = '#5a8fe8' }: { x: number; y: number; ancho: number; alto: number; color?: string }) {
  return (
    <g>
      <rect x={x - ancho} y={y} width={ancho * 2} height={alto} rx="16" fill={color} />
      <rect x={x - ancho * 0.6} y={y + alto * 0.45} width={ancho * 1.2} height={alto * 0.4} rx="9" fill="#fff" opacity="0.22" />
      <rect x={x - ancho} y={y + 4} width={ancho * 2} height="8" rx="4" fill="#fff" opacity="0.2" />
    </g>
  )
}

/** Tirantes de la mochila que pasan por delante. */
export function Tirantes({ x, y, ancho, largo, color = '#3f6bc9' }: { x: number; y: number; ancho: number; largo: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth="6" strokeLinecap="round" fill="none">
      <path d={`M ${x - ancho} ${y} Q ${x - ancho - 4} ${y + largo * 0.5} ${x - ancho + 6} ${y + largo}`} />
      <path d={`M ${x + ancho} ${y} Q ${x + ancho + 4} ${y + largo * 0.5} ${x + ancho - 6} ${y + largo}`} />
    </g>
  )
}
