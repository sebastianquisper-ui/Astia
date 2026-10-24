import { useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { useCumplirTarea } from '../formularios/Evidencia'
import { useEditorTarea } from '../formularios/EditorTarea'
import { semanaAcademica, semanaActualDelCiclo } from '../lib/academico'
import { DIAS, MESES, addDays, lunesDe, ymd } from '../lib/fechas'
import { useAviso } from '../ui/Aviso'
import { FilaTarea } from '../ui/FilaTarea'
import { Icono } from '../ui/Icono'
import { useAhora } from '../ui/useAhora'

/** Semana en modo Académico: de lunes a domingo, con las clases y las entregas de cada día. */
export function SemanaAcademica() {
  const { clases, tareas, cursos, perfil } = useDatos()
  const cumplir = useCumplirTarea()
  const { abrir, nodo } = useEditorTarea()
  const avisar = useAviso()
  const ahora = useAhora()
  const [desfase, setDesfase] = useState(0)
  const lunes = addDays(lunesDe(ahora), desfase * 7)
  const domingo = addDays(lunes, 6)
  const dias = semanaAcademica(clases, tareas, lunes)
  const hoyYmd = ymd(ahora)
  const rango = lunes.getMonth() === domingo.getMonth() ? `${lunes.getDate()} al ${domingo.getDate()} ${MESES[domingo.getMonth()]}` : `${lunes.getDate()} ${MESES[lunes.getMonth()]} al ${domingo.getDate()} ${MESES[domingo.getMonth()]}`
  const nCiclo = semanaActualDelCiclo(perfil.inicioCiclo, lunes, perfil.semanasCiclo)
  const vacia = dias.every((d) => d.clases.length === 0 && d.tareas.length === 0)

  return (
    <section className="pantalla">
      <h1 className="titulo">Semana</h1>
      <div className="semana-nav">
        <button className="icono-btn" onClick={() => setDesfase((d) => d - 1)} aria-label="Semana anterior"><Icono nombre="izquierda" tam={18} /></button>
        <div>
          <b>{desfase === 0 ? 'Esta semana' : rango}</b>
          <span className="sub"> · {desfase === 0 ? rango : ''}{nCiclo ? `${desfase === 0 ? ' · ' : ''}semana ${nCiclo} de ${perfil.semanasCiclo}` : ''}</span>
        </div>
        <button className="icono-btn" onClick={() => setDesfase((d) => d + 1)} aria-label="Semana siguiente"><Icono nombre="derecha" tam={18} /></button>
      </div>
      {vacia && <p className="sub" style={{ marginTop: 12 }}>Semana libre: sin clases ni entregas. Agrega tus clases en Más → Horario y tus tareas en la pestaña Tareas.</p>}

      {dias.map((d, i) => {
        const esHoy = ymd(d.fecha) === hoyYmd
        return (
          <div className="dia-bloque" key={i}>
            <h2 className={'dia-titulo' + (esHoy ? ' hoy' : '')}>
              {DIAS[i]} {d.fecha.getDate()}
              {esHoy && <small> · hoy</small>}
            </h2>
            {d.clases.length === 0 && d.tareas.length === 0 && <p className="libre">Libre</p>}
            {d.clases.map((c) => {
              const curso = cursos.find((x) => x.id === c.cursoId)
              return (
                <div key={c.id} className="clase">
                  <i className="barra" style={{ background: curso?.color ?? 'var(--muted)' }} />
                  <span className="hora">{c.inicio} – {c.fin}</span>
                  <span className="nombre">
                    {curso?.nombre ?? 'Curso borrado'}
                    {c.aula && <small>{c.aula}</small>}
                  </span>
                </div>
              )
            })}
            {d.tareas.length > 0 && (
              <div className="tlista">
                {d.tareas.map((t) => (
                  <FilaTarea
                    key={t.id}
                    tarea={t}
                    curso={cursos.find((c) => c.id === t.cursoId)}
                    ahora={ahora}
                    alAbrir={() => abrir(t.id)}
                    alAlternar={() => cumplir(t, { alReabrir: () => avisar('Tarea reabierta.') })}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      {nodo}
    </section>
  )
}
