import { Auriculares, Bufanda, Corona, CoronaFlores, Explorador, Gafas, GorroDormir, Googles, Mago, Mochila, Tirantes } from './accesorios'
import { Brillo, Cara, Chispa, Flor, Grad, ref } from './herramientas'
import type { Capas, Contexto } from './tipos'

const TINTA = '#2c2230'

/** Una hoja que sale de (0,0) hacia arriba; se gira con `ang`. */
function Hoja({ x, y, ang, largo, ancho = 14, color = '#6cc25a', claro = '#a6e27d', clase = 'r-hoja', retraso = 0 }: { x: number; y: number; ang: number; largo: number; ancho?: number; color?: string; claro?: string; clase?: string; retraso?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang})`}>
      <g className={clase} style={{ transformOrigin: '0px 0px', animationDelay: `${retraso}s` }}>
        <path d={`M 0 0 C ${-ancho} ${-largo * 0.3} ${-ancho} ${-largo * 0.8} 0 ${-largo} C ${ancho} ${-largo * 0.8} ${ancho} ${-largo * 0.3} 0 0 Z`} fill={color} />
        <path d={`M 0 0 C ${-ancho} ${-largo * 0.3} ${-ancho * 0.9} ${-largo * 0.7} 0 ${-largo} C ${-ancho * 0.2} ${-largo * 0.6} ${-ancho * 0.3} ${-largo * 0.3} 0 0 Z`} fill={claro} opacity="0.55" />
        <path d={`M 0 -2 L 0 ${-largo * 0.85}`} stroke="#3f8f3b" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      </g>
    </g>
  )
}

// ───────────── Axolín ─────────────
export function axolin(c: Contexto): Capas {
  const e = c.etapa
  const branq = (lado: -1 | 1) => {
    const ox = 100 + lado * 44
    const oy = 96
    return (
      <g key={lado} className="r-branq" style={{ transformOrigin: `${ox}px ${oy}px`, animationDelay: lado === 1 ? '0.6s' : '0s' }}>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx="0" cy="-17" rx="5.4" ry="18" transform={`translate(${ox} ${oy}) rotate(${lado * (52 + i * 30)})`} fill={ref(c, 'br')} />
        ))}
      </g>
    )
  }
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#ffe3ec" base="#ffb3c9" sombra="#ec8aad" />
        <Grad id={`${c.id}-br`} luz="#ffb0c6" base="#ff8aae" sombra="#e8648f" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {e >= 2 && <Mochila x={100} y={104} ancho={64} alto={70} />}
        <g className="r-cola" style={{ transformOrigin: '138px 150px' }}>
          <path d="M 136 148 C 176 156 194 132 184 108 C 176 134 156 134 138 130 Z" fill={ref(c, 'br')} />
        </g>
        {branq(-1)}
        {branq(1)}
      </>
    ),
    cuerpo: (
      <>
        <ellipse cx="68" cy="172" rx="16" ry="9" fill="#e98aab" />
        <ellipse cx="132" cy="172" rx="16" ry="9" fill="#e98aab" />
        <ellipse cx="100" cy="120" rx="62" ry="54" fill={ref(c, 'cu')} />
        <ellipse cx="100" cy="146" rx="38" ry="24" fill="#fff" opacity="0.4" />
        <ellipse cx="46" cy="138" rx="9" ry="14" fill="#f89cba" transform="rotate(18 46 138)" />
        <ellipse cx="154" cy="138" rx="9" ry="14" fill="#f89cba" transform="rotate(-18 154 138)" />
        <ellipse cx="78" cy="86" rx="22" ry="14" fill={`url(#${c.id}-bri)`} />
      </>
    ),
    cara: <Cara animo={c.animo} habla={c.habla} x={100} y={112} sep={25} r={8} mejilla="#ff7ba3" cejas tinta={TINTA} />,
    frente: (
      <>
        {e === 2 && <Gafas x={100} y={112} sep={25} r={14} />}
        {e >= 2 && <Tirantes x={100} y={112} ancho={42} largo={42} />}
        {e === 3 && <Explorador x={100} y={70} />}
        {e === 4 && (
          <>
            <Bufanda x={100} y={150} ancho={42} color="#7b5ccf" />
            <Mago x={100} y={68} />
          </>
        )}
      </>
    ),
  }
}

// ───────────── Taro ─────────────
export function taro(c: Contexto): Capas {
  const e = c.etapa
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#dcf7a8" base="#9bdc72" sombra="#62b150" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {e >= 4 && (
          <>
            <Hoja x={50} y={130} ang={-70} largo={44} ancho={16} retraso={0.2} />
            <Hoja x={150} y={130} ang={70} largo={44} ancho={16} retraso={0.5} />
          </>
        )}
      </>
    ),
    cuerpo: (
      <>
        <ellipse cx="74" cy="173" rx="15" ry="9" fill="#62b150" />
        <ellipse cx="126" cy="173" rx="15" ry="9" fill="#62b150" />
        <path d="M 100 70 C 150 70 156 126 150 150 C 146 176 54 176 50 150 C 44 126 50 70 100 70 Z" fill={ref(c, 'cu')} />
        <ellipse cx="100" cy="152" rx="34" ry="20" fill="#fff" opacity="0.28" />
        <ellipse cx="46" cy="136" rx="8" ry="13" fill="#7cc65e" transform="rotate(22 46 136)" />
        <ellipse cx="154" cy="136" rx="8" ry="13" fill="#7cc65e" transform="rotate(-22 154 136)" />
        <ellipse cx="78" cy="94" rx="20" ry="14" fill={`url(#${c.id}-bri)`} />
      </>
    ),
    cara: <Cara animo={c.animo} habla={c.habla} x={100} y={120} sep={24} r={7.5} mejilla="#ff9a8a" cejas tinta={TINTA} />,
    frente: (
      <>
        {/* brote en la cabeza */}
        <path d="M 100 72 Q 100 58 100 52" stroke="#4aa043" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {e === 1 && (
          <>
            <Hoja x={100} y={56} ang={-48} largo={32} ancho={13} />
            <Hoja x={100} y={56} ang={48} largo={32} ancho={13} retraso={0.4} />
          </>
        )}
        {e >= 2 && (
          <>
            <Hoja x={100} y={62} ang={-62} largo={36} ancho={14} />
            <Hoja x={100} y={62} ang={62} largo={36} ancho={14} retraso={0.4} />
            <Hoja x={100} y={62} ang={0} largo={30} ancho={11} retraso={0.2} />
          </>
        )}
        {e === 2 && <Flor x={100} y={36} s={13} />}
        {e === 3 && (
          <>
            <g>
              <ellipse cx="100" cy="76" rx="46" ry="9" fill="#d9ab4f" />
              <path d="M 66 76 C 66 50 84 44 100 44 C 116 44 134 50 134 76 Z" fill="#efc769" />
              <path d="M 66 70 Q 100 80 134 70 L 134 77 Q 100 87 66 77 Z" fill="#e0614b" />
            </g>
            <Hoja x={118} y={46} ang={28} largo={26} ancho={10} />
          </>
        )}
        {e === 4 && (
          <>
            <CoronaFlores x={100} y={78} ancho={34} />
            <Hoja x={100} y={66} ang={-30} largo={44} ancho={15} />
            <Hoja x={100} y={66} ang={30} largo={44} ancho={15} retraso={0.5} />
            <Chispa x={140} y={60} s={5} />
          </>
        )}
      </>
    ),
  }
}

// ───────────── Nube ─────────────
export function nube(c: Contexto): Capas {
  const e = c.etapa
  const ala = (lado: -1 | 1) => (
    <g key={lado} className="r-ala" style={{ transformOrigin: `${104 + lado * 56}px 120px`, animationDelay: lado === 1 ? '0.15s' : '0s' }}>
      <path d={`M ${104 + lado * 52} 118 C ${104 + lado * 90} 80 ${104 + lado * 96} 124 ${104 + lado * 84} 140 C ${104 + lado * 72} 132 ${104 + lado * 66} 140 ${104 + lado * 52} 136 Z`} fill="#fff" stroke="#c9cff0" strokeWidth="2.5" />
    </g>
  )
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#ffffff" base="#f1f3ff" sombra="#c7ceef" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: e >= 4 ? <>{ala(-1)}{ala(1)}</> : null,
    cuerpo: (
      <>
        <path className="r-flota" d="M 54 158 C 28 158 26 120 54 116 C 50 84 92 66 114 88 C 130 66 170 80 162 114 C 188 120 184 158 152 158 Z" fill={ref(c, 'cu')} stroke="#d5daf5" strokeWidth="2" />
        <ellipse cx="82" cy="94" rx="22" ry="13" fill={`url(#${c.id}-bri)`} />
        <ellipse cx="112" cy="150" rx="34" ry="8" fill="#c7ceef" opacity="0.35" />
      </>
    ),
    cara: <Cara animo={c.animo} habla={c.habla} x={106} y={122} sep={25} r={7} mejilla="#ffb0c4" cejas dormilon tinta={TINTA} />,
    frente: (
      <>
        {e === 1 && <GorroDormir x={96} y={84} s={1.05} />}
        {e === 2 && <Auriculares x={106} y={120} ancho={55} />}
        {e === 3 && (
          <>
            <Googles x={106} y={92} sep={24} r={11} />
            <Bufanda x={106} y={152} ancho={40} color="#f08a3c" />
          </>
        )}
        {e === 4 && <Mago x={108} y={76} color="#5a3fb5" />}
      </>
    ),
  }
}

// ───────────── Mochi ─────────────
export function mochi(c: Contexto): Capas {
  const e = c.etapa
  const oreja = (lado: -1 | 1) => (
    <g key={lado} className="r-oreja" style={{ transformOrigin: `${100 + lado * 40}px 88px`, animationDelay: lado === 1 ? '1.2s' : '0s' }}>
      <path d={`M ${100 + lado * 22} 76 L ${100 + lado * 44} 40 L ${100 + lado * 62} 88 Z`} fill={ref(c, 'cu')} />
      <path d={`M ${100 + lado * 30} 76 L ${100 + lado * 44} 52 L ${100 + lado * 54} 84 Z`} fill="#ff9fb3" />
    </g>
  )
  const bigote = (lado: -1 | 1) => (
    <g key={lado} stroke="#b9855a" strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
      {[-6, 2, 10].map((d, i) => (
        <line key={i} x1={100 + lado * 46} y1={129 + d * 0.4} x2={100 + lado * (70 + (i === 1 ? 6 : 0))} y2={129 + d} />
      ))}
    </g>
  )
  return {
    defs: (
      <>
        <Grad id={`${c.id}-cu`} luz="#fff0da" base="#ffd2a1" sombra="#eaa66c" />
        <Brillo id={`${c.id}-bri`} />
      </>
    ),
    atras: (
      <>
        {e >= 3 && <Mochila x={100} y={118} ancho={50} alto={56} color="#4bb59b" />}
        <g className="r-cola" style={{ transformOrigin: '138px 166px' }}>
          <path d="M 136 170 C 178 176 190 140 172 120 C 178 148 160 160 138 158 Z" fill="#eaa66c" stroke="#d68f55" strokeWidth="2" strokeLinejoin="round" />
        </g>
        {oreja(-1)}
        {oreja(1)}
      </>
    ),
    cuerpo: (
      <>
        <ellipse cx="100" cy="162" rx="42" ry="26" fill={ref(c, 'cu')} />
        <ellipse cx="74" cy="182" rx="15" ry="8" fill="#fff3e2" />
        <ellipse cx="126" cy="182" rx="15" ry="8" fill="#fff3e2" />
        <ellipse cx="100" cy="112" rx="64" ry="52" fill={ref(c, 'cu')} />
        <path d="M 90 66 L 90 78 M 100 64 L 100 78 M 110 66 L 110 78" stroke="#d68f55" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="76" cy="86" rx="22" ry="12" fill={`url(#${c.id}-bri)`} />
      </>
    ),
    cara: (
      <Cara animo={c.animo} habla={c.habla} x={100} y={114} sep={26} r={7.5} mejilla="#ff9a8a" cejas boca="w" tinta={TINTA}>
        <path d="M 94 130 Q 100 126 106 130 Q 100 138 94 130 Z" fill="#ff8c9d" />
        {bigote(-1)}
        {bigote(1)}
      </Cara>
    ),
    frente: (
      <>
        {e >= 2 && (
          <g transform="rotate(26 150 76)">
            <rect x="146" y="40" width="9" height="48" rx="2" fill="#ffd23f" />
            <rect x="146" y="40" width="9" height="9" rx="2" fill="#f28ca0" />
            <path d="M 146 88 L 150.5 100 L 155 88 Z" fill="#f2d3a8" />
            <path d="M 149 96 L 150.5 100 L 152 96 Z" fill="#3a3040" />
          </g>
        )}
        {e === 2 && (
          <g>
            <path d="M 86 152 L 100 158 L 114 152 L 114 168 L 100 162 L 86 168 Z" fill="#e8545e" />
            <circle cx="100" cy="160" r="4" fill="#c63f4a" />
          </g>
        )}
        {e >= 3 && <Tirantes x={100} y={146} ancho={32} largo={30} color="#2f8f78" />}
        {e === 4 && (
          <>
            <Corona x={100} y={64} s={1.1} />
            <g>
              <rect x="64" y="104" width="30" height="20" rx="9" fill="#1d1a26" />
              <rect x="106" y="104" width="30" height="20" rx="9" fill="#1d1a26" />
              <rect x="92" y="108" width="16" height="4" fill="#1d1a26" />
              <path d="M 70 108 l 8 0 M 112 108 l 8 0" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
            </g>
            <Chispa x={44} y={70} s={6} />
            <Chispa x={160} y={96} s={5} retraso={0.8} />
          </>
        )}
      </>
    ),
  }
}
