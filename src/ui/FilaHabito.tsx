import type { Habito } from '../dominio/tipos'
import { apartadoDe } from '../lib/apartados'
import { INICIALES_DIAS } from '../lib/fechas'
import { cumplido, rachaDe, semanaDe, textoFrecuencia } from '../lib/habitos'
import { Icono } from './Icono'

/** Una fila de hábito: casilla para cumplirlo hoy, nombre, versión mínima y racha. */
export function FilaHabito({ habito, hoy, alAlternar, alAbrir }: { habito: Habito; hoy: Date; alAlternar: () => void; alAbrir?: () => void }) {
  const hecho = cumplido(habito, hoy)
  const racha = rachaDe(habito, hoy)
  const ap = apartadoDe(habito.categoria)
  const texto = (
    <>
      <span className={'habito-nombre' + (hecho ? ' tachada' : '')}>{habito.nombre}</span>
      <span className="habito-meta">
        <span className="con-icono"><Icono nombre={ap.icono} tam={13} />{ap.nombre}</span>
        <span>{textoFrecuencia(habito.frecuencia)}</span>
      </span>
      {!hecho && habito.minimo && <span className="habito-minimo">Mínimo: {habito.minimo}</span>}
    </>
  )
  return (
    <div className={'habito' + (hecho ? ' hecho' : '')} style={{ ['--color' as string]: habito.color }}>
      <button className={'check' + (hecho ? ' on' : '')} aria-pressed={hecho} aria-label={(hecho ? 'Desmarcar: ' : 'Cumplido hoy: ') + habito.nombre} onClick={alAlternar}>
        {hecho && <Icono nombre="check" tam={16} />}
      </button>
      {alAbrir ? (
        <button className="habito-texto" onClick={alAbrir} aria-label={'Ver: ' + habito.nombre}>{texto}</button>
      ) : (
        <div className="habito-texto">{texto}</div>
      )}
      {racha.n > 0 && (
        <span className="racha" title={`Racha de ${racha.n} ${racha.unidad}`}>
          <Icono nombre="fuego" tam={14} />
          {racha.n}
          <small>{racha.unidad === 'días' ? 'd' : 'sem'}</small>
        </span>
      )}
    </div>
  )
}

/** Los 7 puntitos de la semana (lunes a domingo): cumplido, faltó, hoy, libre. */
export function PuntosSemana({ habito, hoy }: { habito: Habito; hoy: Date }) {
  return (
    <div className="puntos-semana" style={{ ['--color' as string]: habito.color }} aria-hidden="true">
      {semanaDe(habito, hoy).map((d, i) => (
        <span key={i} className={'dia-punto ' + d.estado}>
          <i />
          <small>{INICIALES_DIAS[i]}</small>
        </span>
      ))}
    </div>
  )
}
