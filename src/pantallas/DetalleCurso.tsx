import { useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { FormSemanaTema } from '../formularios/FormSemanaTema'
import { semanaActualDelCiclo } from '../lib/academico'
import { MESES, addDays, lunesDe, parseYmd } from '../lib/fechas'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'
import { useAhora } from '../ui/useAhora'
import type { Curso } from '../dominio/tipos'

/** Un curso con sus semanas del ciclo: tema y notas de cada una. */
export function DetalleCurso({ curso, alVolver, alEditar }: { curso: Curso; alVolver: () => void; alEditar: () => void }) {
  const { perfil, semanas, clases, tareas, guardarSemana, borrarSemana } = useDatos()
  const avisar = useAviso()
  const ahora = useAhora()
  const [semana, setSemana] = useState<number | null>(null)
  const actual = semanaActualDelCiclo(perfil.inicioCiclo, ahora, perfil.semanasCiclo)
  const lunes0 = perfil.inicioCiclo ? lunesDe(parseYmd(perfil.inicioCiclo)) : null
  const delCurso = semanas.filter((s) => s.cursoId === curso.id)
  const registro = (n: number) => delCurso.find((s) => s.semana === n)
  const nClases = clases.filter((c) => c.cursoId === curso.id).length
  const nPend = tareas.filter((t) => t.cursoId === curso.id && t.estado === 'pendiente').length
  const fechas = (n: number) => {
    if (!lunes0) return ''
    const l = addDays(lunes0, (n - 1) * 7)
    const d = addDays(l, 6)
    return l.getMonth() === d.getMonth() ? `${l.getDate()} al ${d.getDate()} ${MESES[d.getMonth()]}` : `${l.getDate()} ${MESES[l.getMonth()]} al ${d.getDate()} ${MESES[d.getMonth()]}`
  }
  const guardar = (tema: string, notas: string) => {
    if (semana === null) return
    const previo = registro(semana)
    if (!tema && !notas) {
      if (previo) borrarSemana(previo.id)
    } else {
      guardarSemana({ id: previo?.id ?? `sem-${curso.id}-${semana}`, actualizadoEn: 0, cursoId: curso.id, semana, tema, notas })
    }
    setSemana(null)
    avisar(`Semana ${semana} guardada.`)
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Cursos
      </button>
      <div className="seccion-cab">
        <h1 className="titulo"><i className="punto grande" style={{ background: curso.color, marginRight: 8 }} />{curso.nombre}</h1>
        <button className="btn pequeno" onClick={alEditar}>Editar curso</button>
      </div>
      <p className="sub">
        {nClases} {nClases === 1 ? 'clase' : 'clases'} por semana · {nPend} {nPend === 1 ? 'pendiente' : 'pendientes'}
      </p>
      {!perfil.inicioCiclo && <p className="nota">Pon la fecha de inicio de tu ciclo en Más → Ajustes y verás las fechas de cada semana.</p>}

      <div className="seccion" style={{ marginTop: 14 }}>
        <div className="lista">
          {Array.from({ length: perfil.semanasCiclo }, (_, i) => i + 1).map((n) => {
            const r = registro(n)
            return (
              <button key={n} className={'fila' + (n === actual ? ' actual' : '')} onClick={() => setSemana(n)} aria-label={`Semana ${n}${r?.tema ? ': ' + r.tema : ', sin tema'}`}>
                <span className="ico semana-num">{n}</span>
                <span className="texto">
                  <b>{r?.tema || 'Sin tema'}</b>
                  <span>{[n === actual ? 'Esta semana' : '', fechas(n), r?.notas ? 'con notas' : ''].filter(Boolean).join(' · ') || 'Toca para agregar el tema'}</span>
                </span>
                <Icono nombre="derecha" tam={18} />
              </button>
            )
          })}
        </div>
      </div>

      <Hoja titulo={semana ? `Semana ${semana} · ${curso.nombre}` : ''} abierta={semana !== null} alCerrar={() => setSemana(null)}>
        {semana !== null && <FormSemanaTema key={semana} inicial={registro(semana)} alGuardar={guardar} alCerrar={() => setSemana(null)} />}
      </Hoja>
    </section>
  )
}
