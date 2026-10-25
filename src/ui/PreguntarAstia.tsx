import { useEffect, useRef, useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { hayDictado, useDictado } from '../lib/dictado'
import { responder, type Respuesta } from '../lib/preguntas'
import { hablar } from '../sonidos/voz'
import { useAviso } from './Aviso'
import { Hoja } from './Hoja'
import { Icono } from './Icono'
import { useAhora } from './useAhora'

const EJEMPLOS = ['¿Qué pendientes tengo hoy?', '¿Cuál es mi pendiente más urgente?', '¿Qué tengo esta semana?', '¿Qué clase me toca?', '¿Cuánto enfoque llevo hoy?']

/** Preguntarle a Astia por tus estudios, hablando o escribiendo. Responde con tus datos; Alpi lo lee si activaste su voz. */
export function PreguntarAstia({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  return (
    <Hoja titulo="Pregúntale a Astia" abierta={abierto} alCerrar={alCerrar}>
      {abierto && <Contenido />}
    </Hoja>
  )
}

function Contenido() {
  const { tareas, clases, cursos, habitos, progreso } = useDatos()
  const ahora = useAhora()
  const avisar = useAviso()
  const { escuchando, dictar } = useDictado()
  const [texto, setTexto] = useState('')
  const [resp, setResp] = useState<{ pregunta: string; r: Respuesta } | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  useEffect(() => campo.current?.focus(), [])

  const preguntar = (frase: string) => {
    if (!frase.trim()) return
    const r = responder(frase, { tareas, clases, cursos, habitos, progreso, ahora })
    setResp({ pregunta: frase.trim(), r })
    hablar(r.texto.replace(/\n?•\s*/g, '. '))
  }
  const hablarPregunta = () =>
    dictar(
      (t) => {
        setTexto(t)
        preguntar(t)
      },
      () => avisar('No se pudo usar el micrófono. Usa el del teclado del iPhone: toca el micrófono del teclado y dicta aquí.', 'error'),
    )

  return (
    <div className="preguntar">
      <p className="sub">Pregunta por tus pendientes, tus clases, tu enfoque o tus hábitos. Responde con lo que tienes en la app.</p>
      {hayDictado() && (
        <button className={'btn fz-mic' + (escuchando ? ' escuchando' : '')} onClick={hablarPregunta} aria-pressed={escuchando}>
          <Icono nombre="mic" tam={20} /> {escuchando ? 'Escuchando… toca para parar' : 'Hablar'}
        </button>
      )}
      <form
        className="preguntar-fila"
        onSubmit={(e) => {
          e.preventDefault()
          preguntar(texto)
        }}
      >
        <input ref={campo} className="fz-texto" type="text" aria-label="Tu pregunta" placeholder="Escribe tu pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" className="btn">Preguntar</button>
      </form>
      {resp && (
        <div className="preguntar-respuesta" role="status" aria-live="polite">
          <p className="nota">Tú: {resp.pregunta}</p>
          <p className="preguntar-texto">{resp.r.texto}</p>
        </div>
      )}
      <div className="fz-chips" role="group" aria-label="Preguntas de ejemplo">
        {EJEMPLOS.map((e) => (
          <button key={e} type="button" className="fz-chip" onClick={() => (setTexto(e), preguntar(e))}>{e}</button>
        ))}
      </div>
      <p className="nota">Para que Alpi lea las respuestas, actívalo en Más → Sonidos.</p>
    </div>
  )
}
