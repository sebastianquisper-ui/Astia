import { Bufanda, CoronaFlores, Mochila } from './accesorios'
import { Brillo, Cara, Chispa, Grad, ref } from './herramientas'
import type { Capas, Contexto } from './tipos'

const TINTA = '#2c2230'

// Alpi dibujada en vectores: se usa en las miniaturas y si el teléfono no puede mostrar 3D.
export function alpi(c: Contexto): Capas {
  const e = c.etapa
  const oreja = (l: -1 | 1) => (
    <g key={l} className="r-oreja" style={{ transformOrigin: `${100 + l * 22}px 66px`, animationDelay: l === 1 ? '1s' : '0s' }}>
      <ellipse cx={100 + l * 28} cy="48" rx="8" ry="20" fill="#f2d4a6" transform={`rotate(${l * 18} ${100 + l * 28} 48)`} />
      <ellipse cx={100 + l * 28} cy="50" rx="4" ry="12" fill="#ffb0be" transform={`rotate(${l * 18} ${100 + l * 28} 50)`} />
    </g>
  )
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#fffaf0" base="#fbe8c6" sombra="#dcb985" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {e === 4 && <path d="M 62 118 Q 100 100 138 118 L 156 182 Q 100 194 44 182 Z" fill="#b48be0" stroke="#e9b949" strokeWidth="3" />}
        <Mochila x={100} y={118} ancho={54} alto={42} color={e === 4 ? '#8a5a3c' : e === 1 ? '#6aa8b8' : '#5f9e94'} />
        <circle className="r-cola" style={{ transformOrigin: '146px 150px' }} cx="150" cy="148" r="13" fill="#fff" stroke="#e7cba0" strokeWidth="2" />
        {oreja(-1)}
        {oreja(1)}
      </>
    ),
    cuerpo: (
      <>
        {[66, 84, 116, 134].map((x) => (
          <rect key={x} x={x - 6} y="160" width="12" height="24" rx="6" fill="#dcb985" />
        ))}
        <ellipse cx="100" cy="146" rx="52" ry="36" fill={ref(c, 'cu')} />
        <rect x="80" y="70" width="40" height="86" rx="20" fill={ref(c, 'cu')} />
        <ellipse cx="100" cy="92" rx="36" ry="32" fill={ref(c, 'cu')} />
        {[-24, -12, 0, 12, 24].map((d, i) => (
          <circle key={d} cx={100 + d} cy={64 + (i % 2) * 5 + Math.abs(d) * 0.18} r="13" fill="#fff" stroke="#f0dcb8" strokeWidth="1.5" />
        ))}
        <ellipse cx="100" cy="104" rx="18" ry="13" fill="#fff5e4" />
        <ellipse cx="86" cy="80" rx="12" ry="8" fill={`url(#${c.id}-bri)`} />
        <path d="M 62 132 q 38 12 76 0" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ),
    cara: (
      <Cara animo={c.animo} habla={c.habla} x={100} y={88} sep={17} r={6} mejilla="#ffa6a0" cejas tinta={TINTA} bocaY={15} bocaAncho={5.5}>
        <ellipse cx="100" cy="99" rx="4.5" ry="3" fill="#c98f6c" />
      </Cara>
    ),
    frente: (
      <>
        <Bufanda x={100} y={142} ancho={30} color={e === 3 ? '#7cc79a' : e === 2 ? '#f08a7a' : '#e8553f'} />
        {e >= 3 && (
          <>
            <CoronaFlores x={100} y={54} ancho={28} />
            <Chispa x={44} y={64} s={6} />
            <Chispa x={160} y={52} s={5} retraso={0.7} />
          </>
        )}
      </>
    ),
  }
}
