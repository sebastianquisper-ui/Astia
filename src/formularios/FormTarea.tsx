import { useState } from 'react'
import type { Area, Curso, Prioridad, Tarea, TipoTarea } from '../dominio/tipos'
import { crearId } from '../datos/almacenamiento'
import { APARTADOS, apartadoDe } from '../lib/apartados'
import { ymd } from '../lib/fechas'
import { METODOS, metodoPorId, sugerirMetodo, type MetodoId } from '../lib/metodos'
import { useAviso } from '../ui/Aviso'
import { Icono } from '../ui/Icono'

const TIPOS: { id: TipoTarea; texto: string }[] = [
  { id: 'tarea', texto: 'Tarea' },
  { id: 'estudio', texto: 'Estudio' },
  { id: 'examen', texto: 'Examen' },
]

interface Props {
  inicial?: Tarea
  /** Valores sugeridos al crear (por ejemplo, el área o lo que viene del dictado). */
  plantilla?: Partial<Tarea>
  cursos: Curso[]
  alGuardar: (t: Tarea) => void
  alBorrar?: () => void
  alCerrar: () => void
}

/**
 * Formulario de tarea. El área (Universidad o Mi Órbita) viene del modo en que estás:
 * - Universidad: curso, tipo (tarea, estudio, examen), prioridad y evidencia.
 * - Mi Órbita: solo qué hacer, el apartado (Deporte, Salud...) y cuándo. Nada de exámenes.
 */
export function FormTarea({ inicial, plantilla, cursos, alGuardar, alBorrar, alCerrar }: Props) {
  const avisar = useAviso()
  const area: Area = inicial?.area ?? plantilla?.area ?? 'universidad'
  const personal = area === 'personal'
  const [titulo, setTitulo] = useState(inicial?.titulo ?? plantilla?.titulo ?? '')
  const [cursoId, setCursoId] = useState(inicial?.cursoId ?? plantilla?.cursoId ?? cursos[0]?.id ?? '')
  const [categoria, setCategoria] = useState(apartadoDe(inicial?.categoria ?? plantilla?.categoria ?? 'Salud').nombre)
  const [tipo, setTipo] = useState<TipoTarea>(inicial?.tipo ?? plantilla?.tipo ?? 'tarea')
  const [fecha, setFecha] = useState(inicial?.fecha ?? plantilla?.fecha ?? ymd(new Date()))
  const [hora, setHora] = useState(inicial?.hora ?? plantilla?.hora ?? '')
  const [prioridad, setPrioridad] = useState<Prioridad>(inicial?.prioridad ?? 'media')
  const [evidencia, setEvidencia] = useState(inicial?.pideEvidencia ?? false)
  const [metodo, setMetodo] = useState<string>(inicial?.metodo ?? '') // '' = que Astia lo sugiera
  const [confirmaBorrar, setConfirmaBorrar] = useState(false)
  const apartado = apartadoDe(categoria)
  const nombreCurso = cursos.find((c) => c.id === cursoId)?.nombre ?? ''
  const sugerido: MetodoId = sugerirMetodo({ titulo, tipo, metodo: undefined }, nombreCurso)

  const guardar = () => {
    const limpio = titulo.trim()
    if (!limpio) return avisar(personal ? 'Escribe qué tienes pendiente.' : 'Escribe qué hay que hacer.', 'error')
    if (!fecha) return avisar('Elige la fecha límite.', 'error')
    const base: Tarea = inicial ?? { id: crearId(), titulo: '', area, cursoId: null, tipo: 'tarea', fecha, prioridad: 'media', pideEvidencia: false, pasos: [], estado: 'pendiente', actualizadoEn: 0 }
    alGuardar(
      personal
        ? // Lo personal siempre es una tarea simple: sin tipo, prioridad ni evidencia
          { ...base, titulo: limpio, area, cursoId: null, categoria, tipo: 'tarea', fecha, hora: hora || undefined, prioridad: 'media', pideEvidencia: false, metodo: undefined }
        : { ...base, titulo: limpio, area, cursoId: cursoId || null, categoria: undefined, tipo, fecha, hora: hora || undefined, prioridad, pideEvidencia: evidencia, metodo: metodo || undefined },
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
    >
      <div className="campo">
        <label htmlFor="ft-titulo">{personal ? 'Qué tienes pendiente' : 'Qué hay que hacer'}</label>
        <input id="ft-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={personal ? 'Ejemplo: Sacar cita en el dentista' : 'Ejemplo: Guía 5 de Cálculo II'} autoFocus />
      </div>

      {personal ? (
        <>
          <div className="campo">
            <span className="etiqueta" id="ft-apartado">Apartado</span>
            <div className="apartados" role="group" aria-labelledby="ft-apartado">
              {APARTADOS.map((a) => (
                <button key={a.nombre} type="button" className="apartado-chip" aria-pressed={categoria === a.nombre} onClick={() => setCategoria(a.nombre)} style={{ ['--color' as string]: a.color }}>
                  <Icono nombre={a.icono} tam={16} />
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="tecnica">
            <b>Técnica sugerida: {apartado.tecnica.nombre}</b>
            <span>{apartado.tecnica.porque}</span>
          </div>
        </>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="ft-curso">Curso</label>
            <select id="ft-curso" value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
              <option value="">Sin curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <span className="etiqueta" id="ft-tipo">Tipo</span>
            <div className="seg" role="group" aria-labelledby="ft-tipo">
              {TIPOS.map((t) => (
                <button key={t.id} type="button" aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>{t.texto}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="dos">
        <div className="campo">
          <label htmlFor="ft-fecha">{personal ? 'Para cuándo' : 'Fecha límite'}</label>
          <input id="ft-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ft-hora">Hora (opcional)</label>
          <input id="ft-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>

      {!personal && (
        <>
          <div className="campo">
            <label htmlFor="ft-prio">Prioridad</label>
            <select id="ft-prio" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="ft-metodo">Método de estudio</label>
            <select id="ft-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="">Que Astia lo sugiera ({metodoPorId(sugerido).nombre})</option>
              {METODOS.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <p className="nota">{metodoPorId((metodo || sugerido) as MetodoId).paraQue}. {metodoPorId((metodo || sugerido) as MetodoId).porque}</p>
          </div>
          <label className="interruptor">
            <input type="checkbox" checked={evidencia} onChange={(e) => setEvidencia(e.target.checked)} />
            <span>Pedir evidencia (una foto de que lo hice)</span>
          </label>
        </>
      )}

      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
      {alBorrar && (
        <div className="acciones">
          <button type="button" className="btn peligro" onClick={() => (confirmaBorrar ? alBorrar() : setConfirmaBorrar(true))}>
            {confirmaBorrar ? 'Toca otra vez para borrar' : personal ? 'Borrar pendiente' : 'Borrar tarea'}
          </button>
        </div>
      )}
    </form>
  )
}
