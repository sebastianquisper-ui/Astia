import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { diaCumplido, rachaDeDias, resumenReciente } from '../lib/academico'
import { INICIALES_DIAS, addDays, ymd } from '../lib/fechas'
import { rachaDe } from '../lib/habitos'
import { Icono } from '../ui/Icono'
import { useAhora } from '../ui/useAhora'

const horas = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`)

/** Rachas de días cumpliendo, resumen de la semana y las últimas 4 semanas de un vistazo. */
export function Progreso({ alVolver }: { alVolver: () => void }) {
  const { ajustes } = useAjustes()
  const { progreso, habitos } = useDatos()
  const ahora = useAhora()
  const racha = rachaDeDias(progreso, ahora)
  const sem = resumenReciente(progreso, ahora, 7)
  const hoyYmd = ymd(ahora)
  const personal = ajustes.modo === 'personal'
  const dias = Array.from({ length: 28 }, (_, i) => addDays(ahora, i - 27))
  const hechosPorDia = new Map(progreso.map((p) => [p.fecha, p]))
  const topHabitos = habitos
    .map((h) => ({ h, r: rachaDe(h, ahora) }))
    .filter((x) => x.r.n > 0)
    .sort((a, b) => b.r.n - a.r.n)
    .slice(0, 5)

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Progreso y rachas</h1>
      <p className="sub">Un día cuenta si hiciste una tarea o enfocaste con el temporizador.</p>

      <div className="estadisticas">
        <div><b>{racha.actual}</b><span>{racha.actual === 1 ? 'día seguido' : 'días seguidos'}</span></div>
        <div><b>{racha.mejor}</b><span>mejor racha</span></div>
        <div><b>{sem.diasCumplidos}/7</b><span>días esta semana</span></div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Últimos 7 días</h2>
        <div className="estadisticas">
          <div><b>{sem.hechas}</b><span>{sem.hechas === 1 ? 'tarea hecha' : 'tareas hechas'}</span></div>
          <div><b>{sem.pomodoros}</b><span>pomodoros</span></div>
          <div><b>{horas(sem.enfoque)}</b><span>de enfoque</span></div>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Últimas 4 semanas</h2>
        <div className="mes-grid" role="img" aria-label={`Días cumplidos en las últimas 4 semanas: ${dias.filter((d) => diaCumplido(hechosPorDia.get(ymd(d)))).length} de 28`}>
          {INICIALES_DIAS.map((d, i) => (
            <span key={i} className="mes-dia-nombre">{d}</span>
          ))}
          {Array.from({ length: (dias[0].getDay() + 6) % 7 }, (_, i) => (
            <span key={'v' + i} />
          ))}
          {dias.map((d) => {
            const k = ymd(d)
            const hecho = diaCumplido(hechosPorDia.get(k))
            return <span key={k} className={'mes-celda calor' + (hecho ? ' hecho' : '') + (k === hoyYmd ? ' hoy' : '')} style={{ ['--color' as string]: 'var(--accent)' }} title={k}>{d.getDate()}</span>
          })}
        </div>
      </div>

      {(personal || topHabitos.length > 0) && (
        <div className="seccion">
          <h2 className="titulo">Rachas de hábitos</h2>
          {topHabitos.length === 0 ? (
            <p className="libre">Cuando cumplas hábitos varios días seguidos, sus rachas aparecen aquí.</p>
          ) : (
            <div className="lista">
              {topHabitos.map(({ h, r }) => (
                <div key={h.id} className="fila" style={{ ['--color' as string]: h.color }}>
                  <i className="punto grande" style={{ background: h.color }} />
                  <span className="texto"><b>{h.nombre}</b><span>{r.n} {r.unidad} seguidos</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
