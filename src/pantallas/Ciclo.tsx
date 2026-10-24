import { useState } from 'react'
import { usePeriodo } from '../ajustes/usePeriodo'
import { useDatos } from '../datos/DatosProvider'
import { cargaDelCiclo, semanaActualDelCiclo } from '../lib/academico'
import { NOMBRE_TIPO_SEMANA, type TipoSemana } from '../lib/etapa'
import { MESES } from '../lib/fechas'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

const OPCIONES: { id: TipoSemana | null; texto: string; detalle: string }[] = [
  { id: null, texto: 'Normal', detalle: 'Una semana de clases como cualquier otra.' },
  { id: 'examenes', texto: 'Exámenes', detalle: 'Semana de exámenes o evaluaciones.' },
  { id: 'libre', texto: 'Sin clases', detalle: 'Feriado, vacaciones o descanso.' },
]

/** Las semanas del periodo de un vistazo: carga de entregas y exámenes. Toca una semana para marcarla (exámenes, sin clases). */
export function Ciclo({ alVolver, alAjustes }: { alVolver: () => void; alAjustes: () => void }) {
  const { perfil, tareas, guardarPerfil } = useDatos()
  const { nombre, minuscula } = usePeriodo()
  const avisar = useAviso()
  const ahora = useAhora()
  const [semana, setSemana] = useState<number | null>(null)
  const especiales = perfil.semanasEspeciales ?? {}
  const carga = cargaDelCiclo(tareas, perfil.inicioCiclo, perfil.semanasCiclo, especiales)
  const actual = semanaActualDelCiclo(perfil.inicioCiclo, ahora, perfil.semanasCiclo)
  const maximo = Math.max(1, ...carga.map((s) => s.total))

  const marcar = (tipo: TipoSemana | null) => {
    if (semana === null) return
    const nuevo = { ...especiales }
    if (tipo) nuevo[String(semana)] = tipo
    else delete nuevo[String(semana)]
    guardarPerfil({ semanasEspeciales: Object.keys(nuevo).length ? nuevo : undefined })
    avisar(`Semana ${semana}: ${tipo ? NOMBRE_TIPO_SEMANA[tipo].toLowerCase() : 'normal'}.`)
    setSemana(null)
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">{nombre} completo</h1>
      <p className="sub">
        {actual ? `Hoy estás en la semana ${actual} de ${perfil.semanasCiclo}.` : `Las ${perfil.semanasCiclo} semanas y su carga de entregas.`} Toca una semana para marcarla.
      </p>
      {carga.length === 0 ? (
        <div className="seccion">
          <Vacio titulo="Falta la fecha de inicio" texto={`Pon cuándo empieza tu ${minuscula} y verás aquí cada semana con sus entregas y exámenes.`} />
          <button className="btn" style={{ marginTop: 12 }} onClick={alAjustes}>Ir a Ajustes</button>
        </div>
      ) : (
        <div className="seccion">
          <div className="lista">
            {carga.map((s) => (
              <button key={s.semana} className={'fila ciclo-fila' + (s.semana === actual ? ' actual' : '') + (s.tipo ? ' ' + s.tipo : '')} onClick={() => setSemana(s.semana)} aria-label={`Semana ${s.semana}${s.tipo ? ', ' + NOMBRE_TIPO_SEMANA[s.tipo].toLowerCase() : ''}: ${s.total} entregas, ${s.examenes} exámenes`}>
                <span className="ico semana-num">{s.semana}</span>
                <span className="texto">
                  <b>
                    {s.lunes.getDate()} {MESES[s.lunes.getMonth()]}{s.semana === actual ? ' · esta semana' : ''}
                    {s.tipo && <span className={'etiqueta ' + (s.tipo === 'examenes' ? 'ambar' : '')} style={{ marginLeft: 8 }}>{NOMBRE_TIPO_SEMANA[s.tipo]}</span>}
                  </b>
                  <span>
                    {s.total === 0 ? 'Sin entregas' : `${s.total} ${s.total === 1 ? 'entrega' : 'entregas'}${s.pendientes ? `, ${s.pendientes} por hacer` : ', todo hecho'}`}
                    {s.examenes > 0 && ` · ${s.examenes} ${s.examenes === 1 ? 'examen' : 'exámenes'}`}
                  </span>
                  <span className="carga" aria-hidden="true"><i style={{ width: `${(s.total / maximo) * 100}%` }} className={s.examenes ? 'examen' : ''} /></span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Hoja titulo={semana ? `Semana ${semana}` : ''} abierta={semana !== null} alCerrar={() => setSemana(null)}>
        <div className="seg vertical" role="group" aria-label="Tipo de semana">
          {OPCIONES.map((o) => (
            <button key={o.texto} aria-pressed={(semana === null ? null : (especiales[String(semana)] ?? null)) === o.id} onClick={() => marcar(o.id)}>
              <b>{o.texto}</b> <span className="nota">{o.detalle}</span>
            </button>
          ))}
        </div>
      </Hoja>
    </section>
  )
}
