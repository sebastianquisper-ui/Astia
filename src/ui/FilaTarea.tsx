import type { Curso, Tarea } from '../dominio/tipos'
import { textoVence, urgenciaDe } from '../lib/urgencia'
import { Icono } from './Icono'

export function FilaTarea({ tarea, curso, ahora, alAlternar, alAbrir }: { tarea: Tarea; curso?: Curso; ahora: Date; alAlternar: () => void; alAbrir?: () => void }) {
  const urgencia = urgenciaDe(tarea, ahora)
  const hecha = tarea.estado === 'hecha'
  const contenido = (
    <>
      <span className={'tarea-titulo' + (hecha ? ' tachada' : '')}>{tarea.titulo}</span>
      <span className="tarea-meta">
        {curso ? (
          <span><i className="punto" style={{ background: curso.color }} />{curso.nombre}</span>
        ) : (
          <span><i className="punto personal" />{tarea.area === 'personal' ? (tarea.categoria ?? 'Personal') : 'Sin curso'}</span>
        )}
        {tarea.tipo === 'examen' && <span className="etiqueta ambar">Examen</span>}
        <span className={'etiqueta ' + urgencia}>{textoVence(tarea, ahora)}</span>
      </span>
    </>
  )
  return (
    <div className={'tarea u-' + urgencia}>
      <button className={'check' + (hecha ? ' on' : '')} aria-pressed={hecha} aria-label={(hecha ? 'Reabrir: ' : 'Marcar hecha: ') + tarea.titulo} onClick={alAlternar}>
        {hecha && <Icono nombre="check" tam={16} />}
      </button>
      {alAbrir ? (
        <button className="tarea-texto" onClick={alAbrir} aria-label={'Editar: ' + tarea.titulo}>{contenido}</button>
      ) : (
        <div className="tarea-texto">{contenido}</div>
      )}
    </div>
  )
}
