import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { useCumplirTarea } from '../formularios/Evidencia'
import { useEditorTarea } from '../formularios/EditorTarea'
import { cuadriculaDelMes } from '../lib/academico'
import { INICIALES_DIAS, MESES_LARGOS, fechaCorta, parseYmd, ymd } from '../lib/fechas'
import { porUrgencia } from '../lib/urgencia'
import { useAviso } from '../ui/Aviso'
import { FilaTarea } from '../ui/FilaTarea'
import { Icono } from '../ui/Icono'
import { useAhora } from '../ui/useAhora'

/** Calendario del mes: los días con entregas llevan un punto (rojo si hay examen). Toca un día para ver qué vence. */
export function Calendario({ alVolver }: { alVolver: () => void }) {
  const { ajustes } = useAjustes()
  const { tareas, cursos } = useDatos()
  const cumplir = useCumplirTarea()
  const { abrir, nodo } = useEditorTarea()
  const avisar = useAviso()
  const ahora = useAhora()
  const hoyYmd = ymd(ahora)
  const area = ajustes.modo === 'personal' ? 'personal' : 'universidad'
  const [mes, setMes] = useState(() => new Date(ahora.getFullYear(), ahora.getMonth(), 1))
  const [dia, setDia] = useState(hoyYmd)

  const delModo = tareas.filter((t) => t.area === area)
  const filas = cuadriculaDelMes(mes.getFullYear(), mes.getMonth())
  const delDia = delModo.filter((t) => t.fecha === dia).sort(porUrgencia)
  const cambiarMes = (delta: number) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Calendario</h1>
      <div className="mes-cab">
        <button className="icono-btn" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><Icono nombre="izquierda" tam={18} /></button>
        <b>{MESES_LARGOS[mes.getMonth()]} {mes.getFullYear()}</b>
        <button className="icono-btn" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><Icono nombre="derecha" tam={18} /></button>
      </div>
      <div className="mes-grid" role="group" aria-label="Calendario del mes">
        {INICIALES_DIAS.map((d, i) => (
          <span key={i} className="mes-dia-nombre">{d}</span>
        ))}
        {filas.flat().map((f, i) => {
          if (!f) return <span key={'v' + i} />
          const k = ymd(f)
          const deldia = delModo.filter((t) => t.fecha === k)
          const pendientes = deldia.filter((t) => t.estado === 'pendiente')
          const examen = pendientes.some((t) => t.tipo === 'examen')
          const marca = examen ? 'examen' : pendientes.length ? 'pend' : deldia.length ? 'hecha' : ''
          return (
            <button
              key={k}
              className={'mes-celda cal' + (k === hoyYmd ? ' hoy' : '') + (k === dia ? ' elegido' : '') + (marca ? ' ' + marca : '')}
              style={{ ['--color' as string]: 'var(--accent)' }}
              aria-pressed={k === dia}
              aria-label={`${f.getDate()} de ${MESES_LARGOS[f.getMonth()]}${deldia.length ? `, ${deldia.length} ${deldia.length === 1 ? 'entrega' : 'entregas'}` : ''}${examen ? ', hay examen' : ''}`}
              onClick={() => setDia(k)}
            >
              {f.getDate()}
              {marca && <i className="cal-punto" />}
            </button>
          )
        })}
      </div>
      <p className="nota">Punto rojo: examen · punto de color: entrega pendiente · punto gris: todo hecho.</p>

      <div className="seccion">
        <h2 className="titulo">{dia === hoyYmd ? 'Hoy' : fechaCorta(parseYmd(dia))}</h2>
        {delDia.length === 0 ? (
          <p className="libre">Nada vence este día.</p>
        ) : (
          <div className="tlista">
            {delDia.map((t) => (
              <FilaTarea key={t.id} tarea={t} curso={cursos.find((c) => c.id === t.cursoId)} ahora={ahora} alAbrir={() => abrir(t.id)} alAlternar={() => cumplir(t, { alReabrir: () => avisar('Reabierta.') })} />
            ))}
          </div>
        )}
        <button className="btn suave" style={{ marginTop: 12 }} onClick={() => abrir(undefined, { area, fecha: dia })}>
          + Agregar para este día
        </button>
      </div>
      {nodo}
    </section>
  )
}
