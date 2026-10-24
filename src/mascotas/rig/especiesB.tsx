import { Bufanda, CoronaFlores, Explorador, Gafas, Googles, Mago, Mochila } from './accesorios'
import { Brillo, Cara, Chispa, Flor, Grad, ref } from './herramientas'
import type { Capas, Contexto } from './tipos'

const TINTA = '#2c2230'

// ───────────── Drako ─────────────
export function drako(c: Contexto): Capas {
  const e = c.etapa
  if (e === 1) {
    return {
      defs: (
        <>
          <Grad id={`${c.id}-cu`} luz="#fffdf0" base="#f4ecd0" sombra="#d8caa0" />
          <Brillo id={`${c.id}-bri`} />
        </>
      ),
      cuerpo: (
        <g className="r-huevo" style={{ transformOrigin: '100px 176px' }}>
          <path d="M 100 46 C 152 46 164 118 152 152 C 144 182 56 182 48 152 C 36 118 48 46 100 46 Z" fill={ref(c, 'cu')} />
          <circle cx="70" cy="80" r="9" fill="#8fd0a8" opacity="0.85" />
          <circle cx="132" cy="92" r="11" fill="#b79be8" opacity="0.8" />
          <circle cx="62" cy="150" r="8" fill="#b79be8" opacity="0.8" />
          <circle cx="140" cy="158" r="7" fill="#8fd0a8" opacity="0.85" />
          <path d="M 70 62 L 82 74 L 92 58 L 104 74 L 116 58 L 128 70" stroke="#a89a6e" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <ellipse cx="78" cy="82" rx="22" ry="16" fill={`url(#${c.id}-bri)`} />
        </g>
      ),
      cara: <g className="r-huevo" style={{ transformOrigin: '100px 176px' }}><Cara animo={c.animo} habla={c.habla} x={100} y={120} sep={22} r={7} mejilla="#ff9a9a" cejas tinta={TINTA} /></g>,
    }
  }
  const verde = e >= 4 ? 'azul' : 'verde'
  const alaColor = e >= 4 ? '#9a7be0' : '#7fd49a'
  const ala = (lado: -1 | 1) => {
    const g = e === 2 ? 0.55 : 1
    const ox = 100 + lado * 44
    return (
      <g key={lado} className="r-ala" style={{ transformOrigin: `${ox}px 118px`, animationDelay: lado === 1 ? '0.12s' : '0s' }}>
        <path
          d={`M ${ox} 112 C ${ox + lado * 54 * g} ${60 - (g - 0.55) * 40} ${ox + lado * 66 * g} ${100 - (g - 0.55) * 10} ${ox + lado * 60 * g} ${136} C ${ox + lado * 46 * g} ${126} ${ox + lado * 36 * g} ${138} ${ox + lado * 22 * g} ${130} Z`}
          fill={alaColor}
          stroke={e >= 4 ? '#7a5cc4' : '#52b172'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    )
  }
  return {
    defs: (
      <>
        {verde === 'verde' ? <Grad id={`${c.id}-cu`} luz="#cdf7c6" base="#8fe0a0" sombra="#4fb97a" /> : <Grad id={`${c.id}-cu`} luz="#c9f1ff" base="#7fd7e0" sombra="#4a9fc4" />}
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {ala(-1)}
        {ala(1)}
        <g className="r-cola" style={{ transformOrigin: '138px 158px' }}>
          <path d="M 136 160 C 176 166 194 140 182 112 C 178 140 160 150 138 146 Z" fill={ref(c, 'cu')} />
          <path d="M 178 112 L 192 104 L 186 124 Z" fill={e >= 4 ? '#ffcf3f' : '#ffb347'} />
        </g>
      </>
    ),
    cuerpo: (
      <>
        <ellipse cx="72" cy="174" rx="16" ry="9" fill="#4fb97a" opacity={e >= 4 ? 0 : 1} />
        <ellipse cx="128" cy="174" rx="16" ry="9" fill="#4fb97a" opacity={e >= 4 ? 0 : 1} />
        {e >= 4 && (
          <>
            <ellipse cx="72" cy="174" rx="16" ry="9" fill="#4a9fc4" />
            <ellipse cx="128" cy="174" rx="16" ry="9" fill="#4a9fc4" />
          </>
        )}
        {[-1, 1].map((l) => (
          <path key={l} d={`M ${100 + l * 22} 76 L ${100 + l * 36} ${e >= 3 ? 40 : 52} L ${100 + l * 44} 82 Z`} fill={e >= 4 ? '#ffcf3f' : '#ffe9a0'} stroke={e >= 4 ? '#e09a1a' : '#e8c660'} strokeWidth="2" strokeLinejoin="round" />
        ))}
        <ellipse cx="100" cy="122" rx="58" ry="52" fill={ref(c, 'cu')} />
        {[-14, 0, 14].map((d) => (
          <path key={d} d={`M ${100 + d - 7} 70 L ${100 + d} 54 L ${100 + d + 7} 70 Z`} fill={e >= 4 ? '#b79be8' : '#ffb347'} />
        ))}
        <ellipse cx="100" cy="150" rx="34" ry="22" fill="#fff4d0" opacity="0.7" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${80 + i * 20} 140 q 0 8 0 14`} stroke="#e9d9a6" strokeWidth="3" strokeLinecap="round" />
        ))}
        <ellipse cx="76" cy="90" rx="22" ry="13" fill={`url(#${c.id}-bri)`} />
      </>
    ),
    cara: <Cara animo={c.animo} habla={c.habla} x={100} y={114} sep={26} r={8} mejilla="#ff9a9a" cejas tinta={TINTA} />,
    frente: (
      <>
        {e === 2 && (
          // medio cascarón del huevo como sombrero
          <path d="M 70 66 L 78 54 L 88 66 L 100 50 L 112 66 L 122 54 L 130 66 C 126 78 74 78 70 66 Z" fill="#f4ecd0" stroke="#d8caa0" strokeWidth="2" strokeLinejoin="round" />
        )}
        {e >= 3 && <Bufanda x={100} y={158} ancho={40} color={e >= 4 ? '#7b5ccf' : '#f08a3c'} />}
        {e >= 4 && (
          <>
            <Chispa x={36} y={66} s={7} />
            <Chispa x={168} y={80} s={5.5} retraso={0.9} color="#e6d6ff" />
            <Chispa x={148} y={36} s={4.5} retraso={0.4} color="#fff" />
          </>
        )}
      </>
    ),
  }
}

// ───────────── Stella ─────────────
function puntos(cx: number, cy: number, ext: number, int: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 === 0 ? ext : int
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

export function stella(c: Contexto): Capas {
  const e = c.etapa
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#fff7b8" base="#ffd84f" sombra="#f2a93b" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {e >= 3 && <path className="r-cola" style={{ transformOrigin: '100px 100px' }} d="M 62 92 L 20 128 L 66 124 L 40 164 L 96 132 Z" fill="#e8545e" />}
        <Chispa x={34} y={52} s={6} color="#fff6c0" />
        <Chispa x={168} y={70} s={5} color="#fff6c0" retraso={0.8} />
      </>
    ),
    cuerpo: (
      <>
        <polygon points={puntos(100, 110, 70, 36)} fill={ref(c, 'cu')} stroke="#ffd84f" strokeWidth="14" strokeLinejoin="round" />
        <polygon points={puntos(100, 110, 70, 36)} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" strokeLinejoin="round" transform="translate(-3 -3)" />
        <ellipse cx="80" cy="82" rx="20" ry="13" fill={`url(#${c.id}-bri)`} />
      </>
    ),
    cara: <Cara animo={c.animo} habla={c.habla} x={100} y={114} sep={20} r={7.5} mejilla="#ff9a6a" cejas tinta={TINTA} />,
    frente: (
      <>
        {e === 2 && (
          <>
            <path d="M 132 52 Q 146 44 156 52 Q 146 62 132 56 Z" fill="#6cc25a" />
            <Flor x={134} y={52} s={14} />
          </>
        )}
        {e === 3 && (
          <>
            <Explorador x={100} y={50} s={0.85} color="#5a6adf" />
            <Googles x={100} y={114} sep={20} r={13} />
            <Chispa x={150} y={36} s={5} color="#fff" retraso={0.3} />
          </>
        )}
      </>
    ),
  }
}

// ───────────── Hooty ─────────────
export function hooty(c: Contexto): Capas {
  const e = c.etapa
  const ceja = (l: -1 | 1) => (
    <g key={l} className="r-oreja" style={{ transformOrigin: `${100 + l * 34}px 76px`, animationDelay: l === 1 ? '1.5s' : '0s' }}>
      <path d={`M ${100 + l * 22} 78 L ${100 + l * 44} 42 L ${100 + l * 52} 88 Z`} fill="#8a5c3c" />
    </g>
  )
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#e9c79a" base="#c99b6d" sombra="#946444" />
        <Grad id={`${c.id}-ve`} luz="#fff6df" base="#f4dfb8" sombra="#d9b98a" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {ceja(-1)}
        {ceja(1)}
      </>
    ),
    cuerpo: (
      <>
        <ellipse cx="82" cy="178" rx="14" ry="7" fill="#f2a03d" />
        <ellipse cx="118" cy="178" rx="14" ry="7" fill="#f2a03d" />
        <ellipse cx="100" cy="124" rx="58" ry="58" fill={ref(c, 'cu')} />
        <ellipse cx="100" cy="146" rx="36" ry="32" fill={ref(c, 've')} />
        {[0, 1, 2].flatMap((fila) =>
          [-1, 0, 1].map((col) => (
            <path key={`${fila}${col}`} d={`M ${100 + col * 15 - 6} ${140 + fila * 11} q 6 8 12 0`} stroke="#c9a06c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          )),
        )}
        <ellipse className="r-ala" style={{ transformOrigin: '46px 120px' }} cx="46" cy="132" rx="12" ry="26" fill="#946444" transform="rotate(12 46 132)" />
        <ellipse className="r-ala" style={{ transformOrigin: '154px 120px', animationDelay: '0.2s' }} cx="154" cy="132" rx="12" ry="26" fill="#946444" transform="rotate(-12 154 132)" />
        <ellipse cx="78" cy="84" rx="22" ry="12" fill={`url(#${c.id}-bri)`} />
        {/* discos de los ojos */}
        <circle cx="74" cy="108" r="24" fill="#fff6e6" stroke="#e1c28f" strokeWidth="3" />
        <circle cx="126" cy="108" r="24" fill="#fff6e6" stroke="#e1c28f" strokeWidth="3" />
      </>
    ),
    cara: (
      <>
        <Cara animo={c.animo} habla={c.habla} x={100} y={108} sep={26} r={9} mejilla="#ff9a8a" cejas boca="ninguna" tinta={TINTA} />
        <path d="M 92 122 L 100 114 L 108 122 L 100 130 Z" fill="#f2a03d" stroke="#d4811f" strokeWidth="2" strokeLinejoin="round" />
        <path className={c.habla ? 'boca-habla' : ''} d="M 93 128 L 100 140 L 107 128 Z" fill="#e08a22" />
      </>
    ),
    frente: (
      <>
        {e >= 1 && e !== 0 && <Gafas x={100} y={108} sep={26} r={23} color={e === 3 ? '#e6c35a' : '#463a6e'} />}
        {e === 2 && <Explorador x={100} y={58} s={0.95} color="#4f9a6a" />}
        {e === 3 && (
          <>
            <Mago x={100} y={60} color="#2e3f9e" cinta="#e6c35a" />
            <Chispa x={152} y={46} s={6} color="#fff6c0" retraso={0.5} />
          </>
        )}
      </>
    ),
  }
}

// ───────────── Alpi ─────────────
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
        {e >= 2 && <Mochila x={100} y={118} ancho={54} alto={42} color="#d96a5b" />}
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
        {e >= 2 && <Bufanda x={100} y={142} ancho={30} color={e >= 3 ? '#e9b43a' : '#d96a5b'} />}
        {e === 3 && (
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
