import { useState } from 'react'
import type { Area, Curso, Prioridad, Tarea, TipoTarea } from '../dominio/tipos'
import { crearId } from '../datos/almacenamiento'
import { ymd } from '../lib/fechas'
import { useAviso } from '../ui/Aviso'

const CATEGORIAS = ['Casa', 'Trámites', 'Familia', 'Salud', 'Dinero', 'Otro']
const TIPOS: { id: TipoTarea; texto: string }[] = [
  { id: 'tarea', texto: 'Tarea' },
  { id: 'estudio', texto: 'Estudio' },
  { id: 'examen', texto: 'Examen' },
]

interface Props {
  inicial?: Tarea
  /** Valores sugeridos al crear (por ejemplo, desde el dictado). */
  plantilla?: Partial<Tarea>
  cursos: Curso[]
  alGuardar: (t: Tarea) => void
  alBorrar?: () => void
  alCerrar: () => void
}

export function FormTarea({ inicial, plantilla, cursos, alGuardar, alBorrar, alCerrar }: Props) {
  const avisar = useAviso()
  const [titulo, setTitulo] = useState(inicial?.titulo ?? plantilla?.titulo ?? '')
  const [area, setArea] = useState<Area>(inicial?.area ?? plantilla?.area ?? 'universidad')
  const [cursoId, setCursoId] = useState(inicial?.cursoId ?? plantilla?.cursoId ?? cursos[0]?.id ?? '')
  const [categoria, setCategoria] = useState(inicial?.categoria ?? 'Casa')
  const [tipo, setTipo] = useState<TipoTarea>(inicial?.tipo ?? plantilla?.tipo ?? 'tarea')
  const [fecha, setFecha] = useState(inicial?.fecha ?? plantilla?.fecha ?? ymd(new Date()))
  const [hora, setHora] = useState(inicial?.hora ?? plantilla?.hora ?? '')
  const [prioridad, setPrioridad] = useState<Prioridad>(inicial?.prioridad ?? 'media')
  const [evidencia, setEvidencia] = useState(inicial?.pideEvidencia ?? false)
  const [confirmaBorrar, setConfirmaBorrar] = useState(false)

  const guardar = () => {
    const limpio = titulo.trim()
    if (!limpio) return avisar('Escribe qué hay que hacer.', 'error')
    if (!fecha) return avisar('Elige la fecha límite.', 'error')
    const base: Tarea = inicial ?? { id: crearId(), titulo: '', area, cursoId: null, tipo, fecha, prioridad, pideEvidencia: false, pasos: [], estado: 'pendiente', actualizadoEn: 0 }
    alGuardar({
      ...base,
      titulo: limpio,
      area,
      cursoId: area === 'universidad' ? cursoId || null : null,
      categoria: area === 'personal' ? categoria : undefined,
      tipo,
      fecha,
      hora: hora || undefined,
      prioridad,
      pideEvidencia: area === 'universidad' && evidencia,
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
    >
      <div className="campo">
        <label htmlFor="ft-titulo">Qué hay que hacer</label>
        <input id="ft-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ejemplo: Guía 5 de Cálculo II" autoFocus />
      </div>

      <div className="campo">
        <span className="etiqueta" id="ft-area">Área</span>
        <div className="seg" role="group" aria-labelledby="ft-area">
          <button type="button" aria-pressed={area === 'universidad'} onClick={() => setArea('universidad')}>Universidad</button>
          <button type="button" aria-pressed={area === 'personal'} onClick={() => setArea('personal')}>Mi Órbita</button>
        </div>
      </div>

      {area === 'universidad' ? (
        <div className="campo">
          <label htmlFor="ft-curso">Curso</label>
          <select id="ft-curso" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
            <option value="">Sin curso</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="campo">
          <label htmlFor="ft-cat">Categoría</label>
          <select id="ft-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      <div className="campo">
        <span className="etiqueta" id="ft-tipo">Tipo</span>
        <div className="seg" role="group" aria-labelledby="ft-tipo">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>{t.texto}</button>
          ))}
        </div>
      </div>

      <div className="dos">
        <div className="campo">
          <label htmlFor="ft-fecha">Fecha límite</label>
          <input id="ft-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ft-hora">Hora (opcional)</label>
          <input id="ft-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="ft-prio">Prioridad</label>
        <select id="ft-prio" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {area === 'universidad' && (
        <label className="interruptor">
          <input type="checkbox" checked={evidencia} onChange={(e) => setEvidencia(e.target.checked)} />
          <span>Pedir evidencia (una foto de que lo hice)</span>
        </label>
      )}

      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
      {alBorrar && (
        <div className="acciones">
          <button
            type="button"
            className="btn peligro"
            onClick={() => (confirmaBorrar ? alBorrar() : setConfirmaBorrar(true))}
          >
            {confirmaBorrar ? 'Toca otra vez para borrar' : 'Borrar tarea'}
          </button>
        </div>
      )}
    </form>
  )
}
