import { useDatos } from '../datos/DatosProvider'
import { cargaDelCiclo, semanaActualDelCiclo } from '../lib/academico'
import { MESES } from '../lib/fechas'
import { Icono } from '../ui/Icono'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

/** Las semanas del ciclo de un vistazo: cuánta carga de entregas y exámenes tiene cada una. */
export function Ciclo({ alVolver, alAjustes }: { alVolver: () => void; alAjustes: () => void }) {
  const { perfil, tareas } = useDatos()
  const ahora = useAhora()
  const carga = cargaDelCiclo(tareas, perfil.inicioCiclo, perfil.semanasCiclo)
  const actual = semanaActualDelCiclo(perfil.inicioCiclo, ahora, perfil.semanasCiclo)
  const maximo = Math.max(1, ...carga.map((s) => s.total))

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Ciclo completo</h1>
      <p className="sub">
        {actual ? `Hoy estás en la semana ${actual} de ${perfil.semanasCiclo}.` : `Las ${perfil.semanasCiclo} semanas y su carga de entregas.`}
      </p>
      {carga.length === 0 ? (
        <div className="seccion">
          <Vacio titulo="Falta la fecha de inicio" texto="Pon cuándo empieza tu ciclo y verás aquí cada semana con sus entregas y exámenes." />
          <button className="btn" style={{ marginTop: 12 }} onClick={alAjustes}>Ir a Ajustes</button>
        </div>
      ) : (
        <div className="seccion">
          <div className="lista">
            {carga.map((s) => (
              <div key={s.semana} className={'fila ciclo-fila' + (s.semana === actual ? ' actual' : '')} aria-label={`Semana ${s.semana}: ${s.total} entregas, ${s.examenes} exámenes`}>
                <span className="ico semana-num">{s.semana}</span>
                <span className="texto">
                  <b>{s.lunes.getDate()} {MESES[s.lunes.getMonth()]}{s.semana === actual ? ' · esta semana' : ''}</b>
                  <span>
                    {s.total === 0 ? 'Sin entregas' : `${s.total} ${s.total === 1 ? 'entrega' : 'entregas'}${s.pendientes ? `, ${s.pendientes} por hacer` : ', todo hecho'}`}
                    {s.examenes > 0 && ` · ${s.examenes} ${s.examenes === 1 ? 'examen' : 'exámenes'}`}
                  </span>
                  <span className="carga" aria-hidden="true"><i style={{ width: `${(s.total / maximo) * 100}%` }} className={s.examenes ? 'examen' : ''} /></span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
