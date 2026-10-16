import { useEffect, useRef, useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { useEditorTarea } from '../formularios/EditorTarea'
import { animoDe, fraseDe, frasesToque, type Animo } from '../lib/avatar'
import { claseAhora } from '../lib/ahora'
import { diffDays } from '../lib/fechas'
import { cumplimientoDeHoy } from '../lib/habitos'
import { planDeHoy } from '../lib/plan'
import { saludoDe } from '../lib/saludo'
import { urgenciaDe } from '../lib/urgencia'
import { Avatar } from '../ui/Avatar'
import { useAviso } from '../ui/Aviso'
import { FilaTarea } from '../ui/FilaTarea'
import { TarjetaAhora } from '../ui/TarjetaAhora'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

/** Hoy en modo Académico: clase actual, urgencias y tus 3 de hoy de la universidad. */
export function HoyAcademico() {
  const { ajustes, cambiar } = useAjustes()
  const { tareas, planes, cursos, clases, habitos, alternar } = useDatos()
  const { abrir, nodo } = useEditorTarea()
  const avisar = useAviso()
  const ahora = useAhora()

  const [toques, setToques] = useState(0)
  const [habla, setHabla] = useState(false)
  const [reaccion, setReaccion] = useState<{ frase: string; animo: Animo } | null>(null)
  const temporizadores = useRef<number[]>([])
  useEffect(() => () => temporizadores.current.forEach(window.clearTimeout), [])

  const universidad = tareas.filter((t) => t.area === 'universidad')
  const hayDatos = cursos.length > 0 || universidad.length > 0

  // "Tus 3 de hoy": las que elegiste a mano o, si no, las 3 más urgentes
  const plan = planDeHoy(universidad, planes, 'universidad', ahora)

  const pendientes = universidad.filter((t) => t.estado === 'pendiente')
  const vencidas = pendientes.filter((t) => urgenciaDe(t, ahora) === 'vencida').length
  const en48 = pendientes.filter((t) => urgenciaDe(t, ahora) === 'roja').length
  const semana = pendientes.filter((t) => urgenciaDe(t, ahora) === 'ambar').length

  const situacion = {
    hora: ahora.getHours(),
    hayCursos: hayDatos,
    vencidas,
    porHacer: plan.filter((t) => t.estado === 'pendiente').length,
    hechas: plan.filter((t) => t.estado === 'hecha').length,
  }
  const diaDelAnio = diffDays(ahora, new Date(ahora.getFullYear(), 0, 0))
  const animo = reaccion?.animo ?? animoDe(situacion)
  const frase = reaccion?.frase ?? fraseDe(situacion, ajustes.nombre, diaDelAnio)

  const hablarPor = (ms: number) => {
    setHabla(true)
    temporizadores.current.push(window.setTimeout(() => setHabla(false), ms))
  }

  const tocarAvatar = () => {
    const lineas = frasesToque(ajustes.nombre)
    setReaccion({ frase: lineas[toques % lineas.length], animo: animoDe(situacion) === 'durmiendo' ? 'durmiendo' : 'alerta' })
    setToques((n) => n + 1)
    hablarPor(2200)
    temporizadores.current.push(window.setTimeout(() => setReaccion(null), 4500))
  }

  const alternarTarea = (id: string, estabaHecha: boolean) => {
    alternar(id)
    if (estabaHecha) {
      avisar('Tarea reabierta.')
      return
    }
    const faltan = plan.filter((t) => t.estado === 'pendiente' && t.id !== id).length
    const dijo = faltan === 0 && plan.some((t) => t.id === id) ? 'Plan de hoy cumplido. Eso sí.' : 'Una menos. Sigue con la siguiente.'
    setReaccion({ frase: dijo, animo: 'contenta' })
    hablarPor(1800)
    temporizadores.current.push(window.setTimeout(() => setReaccion(null), 3500))
    avisar('Hecha. ' + (faltan === 0 ? 'Cumpliste tu lista.' : `Te faltan ${faltan} de hoy.`))
  }

  const estado = claseAhora(clases, ahora)
  const curso = cursos.find((c) => c.id === estado.clase?.cursoId)
  const orbita = cumplimientoDeHoy(habitos, ahora)

  return (
    <section className="pantalla">
      <h1 className="saludo">
        {saludoDe(ahora.getHours())}, {ajustes.nombre}.
      </h1>

      <div className="hero">
        <button className="avatar-btn" onClick={tocarAvatar} aria-label="Hablar con Astia">
          <Avatar animo={animo} habla={habla} />
        </button>
        <div className="burbuja" aria-live="polite">
          <p>{frase}</p>
        </div>
      </div>

      <TarjetaAhora
        estado={estado}
        curso={curso}
        alEmpezar={() => avisar('El temporizador de estudio llega en la fase 4.')}
        alDictar={() => avisar('El dictado por voz llega en la fase 5.')}
      />

      {hayDatos && (
        <div className="chips">
          <span className={'chip' + (vencidas ? ' vencida' : '')}>{vencidas} {vencidas === 1 ? 'vencida' : 'vencidas'}</span>
          <span className={'chip' + (en48 ? ' roja' : '')}>{en48} en 48 h</span>
          <span className={'chip' + (semana ? ' ambar' : '')}>{semana} esta semana</span>
        </div>
      )}

      <div className="seccion">
        <div className="seccion-cab">
          <h2 className="titulo">Tus 3 de hoy</h2>
          <button className="btn pequeno suave" onClick={() => abrir(undefined, { area: 'universidad' })}>+ Nueva tarea</button>
        </div>
        {plan.length ? (
          <div className="tlista">
            {plan.map((t) => (
              <FilaTarea key={t.id} tarea={t} curso={cursos.find((c) => c.id === t.cursoId)} ahora={ahora} alAlternar={() => alternarTarea(t.id, t.estado === 'hecha')} alAbrir={() => abrir(t.id)} />
            ))}
          </div>
        ) : (
          <Vacio
            titulo={hayDatos ? 'Nada pendiente en la universidad' : 'Sin tareas todavía'}
            texto={hayDatos ? 'Agrega una tarea nueva cuando tengas algo.' : 'Agrega una tarea con el botón de arriba, o importa tu respaldo de la v1 en Más → Ajustes.'}
          />
        )}
      </div>

      {habitos.length > 0 && (
        <button className="enlace-modo" onClick={() => cambiar({ modo: 'personal' })}>
          <span>Mi Órbita · {orbita.total - orbita.hechos === 0 ? 'hábitos de hoy cumplidos' : `te faltan ${orbita.total - orbita.hechos} ${orbita.total - orbita.hechos === 1 ? 'hábito' : 'hábitos'} hoy`}</span>
          <span>Ir →</span>
        </button>
      )}
      {nodo}
    </section>
  )
}
