import { useEffect, useRef, useState } from 'react'
import type { Tarea } from '../dominio/tipos'
import { useDatos } from '../datos/DatosProvider'
import { explicarFalloMicrofono, hayDictado, useDictado } from '../lib/dictado'
import { interpretarTarea } from '../lib/dictadoTareas'
import { useAviso } from '../ui/Aviso'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'

/** Dictar una tarea: dices "examen de cálculo el viernes a las 3", Astia la entiende y te abre el formulario ya lleno para confirmar. */
export function DictadoTarea({ abierto, alCerrar, alEntender }: { abierto: boolean; alCerrar: () => void; alEntender: (plantilla: Partial<Tarea>) => void }) {
  return (
    <Hoja titulo="Dictar una tarea" abierta={abierto} alCerrar={alCerrar}>
      {abierto && <Contenido alCerrar={alCerrar} alEntender={alEntender} />}
    </Hoja>
  )
}

function Contenido({ alCerrar, alEntender }: { alCerrar: () => void; alEntender: (plantilla: Partial<Tarea>) => void }) {
  const { cursos } = useDatos()
  const avisar = useAviso()
  const { escuchando, dictar, bloqueado } = useDictado()
  const [texto, setTexto] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  useEffect(() => campo.current?.focus(), [])

  const entender = (frase: string) => {
    if (!frase.trim()) return avisar('Dime qué tarea es. Por ejemplo: "examen de cálculo el viernes a las 3 de la tarde".', 'error')
    const r = interpretarTarea(frase, cursos)
    alCerrar()
    alEntender({ area: 'universidad', titulo: r.titulo, tipo: r.tipo, ...(r.cursoId ? { cursoId: r.cursoId } : {}), ...(r.fecha ? { fecha: r.fecha } : {}), ...(r.hora ? { hora: r.hora } : {}) })
  }
  const hablar = () =>
    dictar(
      (t) => {
        setTexto(t)
        entender(t)
      },
      (motivo) => avisar(explicarFalloMicrofono(motivo), 'error', { duracion: 7000 }),
    )

  return (
    <div className="fz-dictado">
      <p className="sub">Di o escribe la tarea con su curso y cuándo es. Después la revisas y confirmas.</p>
      {hayDictado() && !bloqueado && (
        <button className={'btn fz-mic' + (escuchando ? ' escuchando' : '')} onClick={hablar} aria-pressed={escuchando}>
          <Icono nombre="mic" tam={20} /> {escuchando ? 'Escuchando… toca para parar' : 'Hablar'}
        </button>
      )}
      <textarea
        ref={campo}
        className="fz-texto"
        rows={3}
        aria-label="Lo que quieres anotar"
        placeholder='Ej.: "informe de física para el viernes a las 8 de la noche"'
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <p className="nota">Si dictas con el micrófono del teclado del iPhone, escribe aquí y toca "Entender".</p>
      <div className="acciones">
        <button className="btn" onClick={() => entender(texto)}>Entender</button>
      </div>
    </div>
  )
}
