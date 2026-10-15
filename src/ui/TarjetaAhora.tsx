import type { Curso } from '../dominio/tipos'
import { formatoCuenta, type EstadoAhora } from '../lib/ahora'
import { DIAS, indiceDia } from '../lib/fechas'

// "Ahora": un anillo (órbita) con un planeta que avanza. En clase = lo que llevas de la clase.
// Próxima clase = se va llenando a medida que se acerca la hora.

const R = 52
const C = 2 * Math.PI * R

export function TarjetaAhora({ estado, curso, alEmpezar, alDictar }: { estado: EstadoAhora; curso?: Curso; alEmpezar: () => void; alDictar: () => void }) {
  const hayClase = estado.tipo !== 'ninguna' && estado.clase
  const cuenta = formatoCuenta(estado.minutos)
  const color = curso?.color ?? 'var(--accent)'

  let titulo = 'Sin clases a la vista'
  let detalle = 'Carga tu horario para ver aquí tu próxima clase.'
  if (hayClase && estado.clase && estado.inicio && estado.fin) {
    const hoy = estado.inicio.toDateString() === new Date().toDateString()
    const cuando = hoy ? '' : DIAS[indiceDia(estado.inicio)] + ' · '
    titulo = curso?.nombre ?? 'Clase'
    detalle = `${cuando}${estado.clase.inicio} – ${estado.clase.fin} · ${estado.clase.aula}`
  }

  return (
    <div className="tarjeta tarjeta-ahora">
      <div className="orbita-fila">
        <div className="orbita" role="img" aria-label={hayClase ? `${cuenta.n} ${cuenta.u}` : 'Sin clases'}>
          <svg viewBox="0 0 132 132">
            <circle className="orbita-pista" cx="66" cy="66" r={R} />
            {hayClase && (
              <>
                <circle
                  className="orbita-avance"
                  cx="66"
                  cy="66"
                  r={R}
                  stroke={color}
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - estado.progreso)}
                  transform="rotate(-90 66 66)"
                />
                {/* El planeta viaja por el anillo hasta donde llega el avance */}
                <g className="planeta" style={{ transform: `rotate(${estado.progreso * 360}deg)`, transformOrigin: '66px 66px' }}>
                  <circle cx="66" cy={66 - R} r="7" fill={color} />
                  <circle cx="66" cy={66 - R} r="11" fill={color} opacity="0.25" />
                </g>
              </>
            )}
          </svg>
          <div className="orbita-centro">
            {hayClase ? (
              <>
                <b>{cuenta.n}</b>
                <small>{cuenta.u}</small>
              </>
            ) : (
              <small>libre</small>
            )}
          </div>
        </div>
        <div className="orbita-texto">
          <p className="sub">{estado.tipo === 'en-clase' ? 'En clase · termina en' : hayClase ? 'Próxima clase · empieza en' : 'Ahora'}</p>
          <p className="grande">{titulo}</p>
          <p className="sub" style={{ marginTop: 4 }}>{detalle}</p>
        </div>
      </div>
      <div className="acciones">
        <button className="btn" onClick={alEmpezar}>Empezar ya</button>
        <button className="btn suave" onClick={alDictar}>Dictar</button>
      </div>
    </div>
  )
}
