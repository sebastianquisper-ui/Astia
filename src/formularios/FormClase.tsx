import { useState } from 'react'
import type { Clase, Curso } from '../dominio/tipos'
import { aMinutos, DIAS_CORTOS } from '../lib/fechas'
import { useAviso } from '../ui/Aviso'

export interface CamposClase {
  cursoId: string
  dias: number[]
  inicio: string
  fin: string
  aula: string
}

export function FormClase({ inicial, cursos, alGuardar, alBorrar, alCerrar }: { inicial?: Clase; cursos: Curso[]; alGuardar: (c: CamposClase) => void; alBorrar?: () => void; alCerrar: () => void }) {
  const avisar = useAviso()
  const [cursoId, setCursoId] = useState(inicial?.cursoId ?? cursos[0]?.id ?? '')
  const [dias, setDias] = useState<number[]>(inicial ? [inicial.dia] : [])
  const [inicio, setInicio] = useState(inicial?.inicio ?? '08:00')
  const [fin, setFin] = useState(inicial?.fin ?? '10:00')
  const [aula, setAula] = useState(inicial?.aula ?? '')
  const [confirma, setConfirma] = useState(false)

  const alternarDia = (d: number) => setDias((previo) => (previo.includes(d) ? previo.filter((x) => x !== d) : [...previo, d].sort()))

  const guardar = () => {
    if (!cursoId) return avisar('Elige un curso.', 'error')
    if (!dias.length) return avisar('Elige al menos un día.', 'error')
    if (!inicio || !fin || aMinutos(fin) <= aMinutos(inicio)) return avisar('Revisa las horas: el fin debe ser después del inicio.', 'error')
    alGuardar({ cursoId, dias, inicio, fin, aula: aula.trim() })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
    >
      <div className="campo">
        <label htmlFor="fl-curso">Curso</label>
        <select id="fl-curso" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div className="campo">
        <span className="etiqueta" id="fl-dias">Días</span>
        <div className="dias" role="group" aria-labelledby="fl-dias">
          {DIAS_CORTOS.map((d, i) => (
            <button key={d} type="button" aria-pressed={dias.includes(i)} onClick={() => alternarDia(i)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="dos">
        <div className="campo">
          <label htmlFor="fl-inicio">Desde</label>
          <input id="fl-inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="fl-fin">Hasta</label>
          <input id="fl-fin" type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="fl-aula">Aula (opcional)</label>
        <input id="fl-aula" type="text" value={aula} onChange={(e) => setAula(e.target.value)} placeholder="Ejemplo: A-203" />
      </div>
      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
      {alBorrar && (
        <div className="acciones">
          <button type="button" className="btn peligro" onClick={() => (confirma ? alBorrar() : setConfirma(true))}>
            {confirma ? 'Toca otra vez para borrar' : 'Borrar clase'}
          </button>
        </div>
      )}
    </form>
  )
}
