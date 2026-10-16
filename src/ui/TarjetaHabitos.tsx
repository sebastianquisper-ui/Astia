import type { Habito, Rutina } from '../dominio/tipos'

// La tarjeta principal de Mi Órbita: un anillo con tu avance de hábitos de hoy
// (el planeta avanza a medida que cumples).

const R = 52
const C = 2 * Math.PI * R

export function TarjetaHabitos({ hechos, total, siguiente, rutina, alRutina, alHabitos, alNuevo }: { hechos: number; total: number; siguiente?: Habito; rutina?: Rutina; alRutina: () => void; alHabitos: () => void; alNuevo: () => void }) {
  const progreso = total === 0 ? 0 : hechos / total
  const completo = total > 0 && hechos === total
  const color = siguiente?.color ?? 'var(--accent)'
  return (
    <div className="tarjeta tarjeta-ahora">
      <div className="orbita-fila">
        <div className="orbita" role="img" aria-label={`${hechos} de ${total} hábitos cumplidos hoy`}>
          <svg viewBox="0 0 132 132">
            <circle className="orbita-pista" cx="66" cy="66" r={R} />
            {total > 0 && (
              <>
                <circle className="orbita-avance" cx="66" cy="66" r={R} stroke={completo ? 'var(--green)' : color} strokeDasharray={C} strokeDashoffset={C * (1 - progreso)} transform="rotate(-90 66 66)" />
                <g className="planeta" style={{ transform: `rotate(${progreso * 360}deg)`, transformOrigin: '66px 66px' }}>
                  <circle cx="66" cy={66 - R} r="7" fill={completo ? 'var(--green)' : color} />
                  <circle cx="66" cy={66 - R} r="11" fill={completo ? 'var(--green)' : color} opacity="0.25" />
                </g>
              </>
            )}
          </svg>
          <div className="orbita-centro">
            <b>{total === 0 ? '—' : `${hechos}/${total}`}</b>
            <small>hábitos</small>
          </div>
        </div>
        <div className="orbita-texto">
          <p className="sub">Hábitos de hoy</p>
          <p className="grande">{total === 0 ? 'Aún no tienes hábitos' : completo ? 'Todo cumplido' : siguiente ? siguiente.nombre : 'Sigue así'}</p>
          {total > 0 && !completo && siguiente?.minimo && <p className="sub" style={{ marginTop: 4 }}>Mínimo: {siguiente.minimo}</p>}
          {rutina && !completo && <p className="sub" style={{ marginTop: 4 }}>Pendiente: {rutina.nombre}</p>}
        </div>
      </div>
      <div className="acciones">
        {rutina ? (
          <button className="btn" onClick={alRutina}>Empezar rutina</button>
        ) : (
          <button className="btn" onClick={alHabitos}>Ver hábitos</button>
        )}
        <button className="btn suave" onClick={alNuevo}>+ Hábito</button>
      </div>
    </div>
  )
}
