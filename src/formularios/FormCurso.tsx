import { useState } from 'react'
import type { Curso } from '../dominio/tipos'
import { crearId } from '../datos/almacenamiento'
import { useAviso } from '../ui/Aviso'

export const COLORES_CURSO = ['#7C8CFF', '#FF7A90', '#4FD1A5', '#FFB454', '#B18CFF', '#4FC3F7', '#F2D24B', '#FF9E6E']

export function FormCurso({ inicial, colorSugerido, alGuardar, alBorrar, alCerrar }: { inicial?: Curso; colorSugerido: string; alGuardar: (c: Curso) => void; alBorrar?: () => void; alCerrar: () => void }) {
  const avisar = useAviso()
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [color, setColor] = useState(inicial?.color ?? colorSugerido)
  const [confirma, setConfirma] = useState(false)

  const guardar = () => {
    const limpio = nombre.trim()
    if (!limpio) return avisar('Escribe el nombre del curso.', 'error')
    alGuardar({ ...(inicial ?? { id: crearId(), actualizadoEn: 0 }), nombre: limpio, color })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
    >
      <div className="campo">
        <label htmlFor="fc-nombre">Nombre del curso</label>
        <input id="fc-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ejemplo: Matemática Discreta" autoFocus />
      </div>
      <div className="campo">
        <span className="etiqueta" id="fc-color">Color</span>
        <div className="colores" role="group" aria-labelledby="fc-color">
          {COLORES_CURSO.map((c) => (
            <button key={c} type="button" className="color" style={{ background: c }} aria-label={'Color ' + c} aria-pressed={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
      {alBorrar && (
        <div className="acciones">
          <button type="button" className="btn peligro" onClick={() => (confirma ? alBorrar() : setConfirma(true))}>
            {confirma ? 'Toca otra vez para borrar' : 'Borrar curso'}
          </button>
        </div>
      )}
      {alBorrar && confirma && <p className="nota">Se borran también sus clases y notas de semana. Sus tareas se conservan, sin curso.</p>}
    </form>
  )
}
