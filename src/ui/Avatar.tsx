import type { Animo } from '../lib/avatar'

// Astia: una estrella con cara. La cara cambia según su ánimo (estricta, alerta, contenta, dormida).

// Estrella de 5 puntas con esquinas redondeadas (borde grueso del mismo color)
function puntosEstrella(cx: number, cy: number, radioExt: number, radioInt: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 === 0 ? radioExt : radioInt
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`)
  }
  return pts.join(' ')
}
const CUERPO = puntosEstrella(60, 66, 44, 24)

const TINTA = '#2a2230'

function Cara({ animo, habla }: { animo: Animo; habla: boolean }) {
  const ojos = { cy: 63, rx: 4.6 }
  const boca = habla ? (
    <ellipse className="boca-habla" cx="60" cy="77" rx="6" ry="4" fill={TINTA} />
  ) : null

  if (animo === 'contenta') {
    return (
      <g stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M42 64 Q48 56 54 64" />
        <path d="M66 64 Q72 56 78 64" />
        {boca ?? <path d="M51 74 Q60 84 69 74" />}
      </g>
    )
  }
  if (animo === 'durmiendo') {
    return (
      <g stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M42 63 Q48 67 54 63" />
        <path d="M66 63 Q72 67 78 63" />
        {boca ?? <path d="M56 77 h8" />}
      </g>
    )
  }
  const alerta = animo === 'alerta'
  return (
    <g>
      {/* Cejas: inclinadas hacia el centro = estricta. Más inclinadas = alerta */}
      <g stroke={TINTA} strokeWidth="3.4" strokeLinecap="round">
        <line x1="40" y1={alerta ? 48 : 52} x2="55" y2={alerta ? 56 : 55} />
        <line x1="80" y1={alerta ? 48 : 52} x2="65" y2={alerta ? 56 : 55} />
      </g>
      <g fill={TINTA}>
        <ellipse className="ojo" cx="48" cy={ojos.cy} rx={ojos.rx} ry={alerta ? 7.4 : 6} />
        <ellipse className="ojo" cx="72" cy={ojos.cy} rx={ojos.rx} ry={alerta ? 7.4 : 6} />
      </g>
      {boca ?? <line x1="52" y1="77" x2="68" y2="77" stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" />}
    </g>
  )
}

export function Avatar({ animo, habla = false, tam = 112 }: { animo: Animo; habla?: boolean; tam?: number }) {
  return (
    <span className={'avatar ' + animo}>
      <svg width={tam} height={tam} viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id="avatar-cuerpo" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#FFE9B0" />
            <stop offset="100%" stopColor="#E9B04E" />
          </radialGradient>
        </defs>
        <polygon points={CUERPO} fill="url(#avatar-cuerpo)" stroke="url(#avatar-cuerpo)" strokeWidth="12" strokeLinejoin="round" />
        <Cara animo={animo} habla={habla} />
      </svg>
      {animo === 'durmiendo' && (
        <span className="zzz" aria-hidden="true">
          z<small>z</small>
        </span>
      )}
    </span>
  )
}
