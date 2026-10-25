import { useEffect, useRef, useState } from 'react'
import { Icono } from '../ui/Icono'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { useCumplirTarea } from '../formularios/Evidencia'
import { useEditorTarea } from '../formularios/EditorTarea'
import { useEjecutorRutina } from '../formularios/EjecutarRutina'
import { FormHabito } from '../formularios/FormHabito'
import { animoPersonal, frasePersonal, frasesToquePersonal, type Animo } from '../lib/avatar'
import { diffDays } from '../lib/fechas'
import { cumplido, cumplimientoDeHoy, rachaDe, tocaHoy } from '../lib/habitos'
import { planDeHoy } from '../lib/plan'
import { rutinaDeAhora } from '../lib/rutinas'
import { saludoConNombre } from '../lib/saludo'
import { diasDeAtraso, urgenciaDe } from '../lib/urgencia'
import { HeroAstia } from '../mascotas/HeroAstia'
import { sonar } from '../sonidos/reproductor'
import { useAviso } from '../ui/Aviso'
import { FilaHabito } from '../ui/FilaHabito'
import { FilaTarea } from '../ui/FilaTarea'
import { Hoja } from '../ui/Hoja'
import { TarjetaHabitos } from '../ui/TarjetaHabitos'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

/** Hoy en modo Mi Órbita: hábitos del día, rutina del momento y pendientes personales. */
export function HoyPersonal() {
  const { ajustes, cambiar } = useAjustes()
  const { tareas, planes, habitos, rutinas, alternarHabito, guardarHabito } = useDatos()
  const cumplir = useCumplirTarea()
  const { abrir, nodo } = useEditorTarea()
  const ejecutor = useEjecutorRutina()
  const avisar = useAviso()
  const ahora = useAhora()

  const [toques, setToques] = useState(0)
  const [habla, setHabla] = useState(false)
  const [reaccion, setReaccion] = useState<{ frase: string; animo: Animo } | null>(null)
  const [nuevoHabito, setNuevoHabito] = useState(false)
  const temporizadores = useRef<number[]>([])
  useEffect(() => () => temporizadores.current.forEach(window.clearTimeout), [])

  const personales = tareas.filter((t) => t.area === 'personal')
  const pendientesHoy = planDeHoy(personales, planes, 'personal', ahora)
  const vencidas = personales.filter((t) => t.estado === 'pendiente' && urgenciaDe(t, ahora) === 'vencida').length

  // Los hábitos que tocan hoy (los que faltan primero)
  const deHoy = habitos.filter((h) => tocaHoy(h, ahora)).sort((a, b) => Number(cumplido(a, ahora)) - Number(cumplido(b, ahora)))
  const { hechos, total } = cumplimientoDeHoy(habitos, ahora)
  const siguiente = deHoy.find((h) => !cumplido(h, ahora))
  const rutina = rutinaDeAhora(rutinas, ahora)
  const rachaMax = Math.max(0, ...deHoy.map((h) => rachaDe(h, ahora).n))

  const situacion = { hora: ahora.getHours(), hayHabitos: habitos.length > 0, vencidas, habitosHechos: hechos, habitosTotal: total, rachaMax, rutinaPendiente: rutina?.nombre.toLowerCase() }
  const diaDelAnio = diffDays(ahora, new Date(ahora.getFullYear(), 0, 0))
  const animo = reaccion?.animo ?? animoPersonal(situacion)
  const frase = reaccion?.frase ?? frasePersonal(situacion, ajustes.nombre, diaDelAnio)

  const hablarPor = (ms: number) => {
    setHabla(true)
    temporizadores.current.push(window.setTimeout(() => setHabla(false), ms))
  }
  const reaccionar = (f: string, a: Animo, ms = 3500) => {
    setReaccion({ frase: f, animo: a })
    hablarPor(1800)
    temporizadores.current.push(window.setTimeout(() => setReaccion(null), ms))
  }

  const tocarAvatar = () => {
    const lineas = frasesToquePersonal(ajustes.nombre)
    reaccionar(lineas[toques % lineas.length], animoPersonal(situacion) === 'durmiendo' ? 'durmiendo' : 'alerta', 4500)
    setToques((n) => n + 1)
  }

  const cumplirHabito = (id: string, estabaHecho: boolean) => {
    alternarHabito(id)
    if (estabaHecho) return avisar('Hábito desmarcado.')
    void sonar('tareaHecha')
    const faltan = deHoy.filter((h) => !cumplido(h, ahora) && h.id !== id).length
    reaccionar(faltan === 0 ? 'Todos tus hábitos de hoy, cumplidos. Eso es disciplina.' : 'Uno menos. Sigue con el siguiente.', 'contenta')
    avisar(faltan === 0 ? 'Cumpliste todos tus hábitos de hoy.' : `Cumplido. Te faltan ${faltan} hoy.`)
  }

  const irA = (hash: string) => {
    window.location.hash = hash
  }
  const pendientesAcademicos = tareas.filter((t) => t.area === 'universidad' && t.estado === 'pendiente' && ['vencida', 'roja'].includes(urgenciaDe(t, ahora))).length

  return (
    <section className="pantalla">
      <h1 className="saludo">
        {saludoConNombre(ahora.getHours(), ajustes.nombre)}
      </h1>

      <HeroAstia animo={animo} habla={habla} frase={frase} alTocar={tocarAvatar} progreso={{ vencidas, diasAtraso: diasDeAtraso(personales.filter((t) => t.estado === 'pendiente'), ahora), porHacer: total - hechos, hechas: hechos }} baila={reaccion?.animo === 'contenta'} />

      <button className="btn suave" style={{ width: '100%' }} onClick={() => irA('#/mas/agenda')}>
        <Icono nombre="reloj" tam={18} /> Recordarme algo
      </button>

      <TarjetaHabitos
        hechos={hechos}
        total={total}
        siguiente={siguiente}
        rutina={rutina}
        alRutina={() => rutina && ejecutor.empezar(rutina.id)}
        alHabitos={() => irA('#/habitos')}
        alNuevo={() => setNuevoHabito(true)}
      />

      <div className="seccion">
        <div className="seccion-cab">
          <h2 className="titulo">Hábitos de hoy</h2>
          <button className="btn pequeno suave" onClick={() => irA('#/habitos')}>Ver todos</button>
        </div>
        {deHoy.length ? (
          <div className="tlista">
            {deHoy.map((h) => (
              <div key={h.id} className="habito-card">
                <FilaHabito habito={h} hoy={ahora} alAlternar={() => cumplirHabito(h.id, cumplido(h, ahora))} alAbrir={() => irA('#/habitos')} />
              </div>
            ))}
          </div>
        ) : (
          <Vacio titulo={habitos.length ? 'Hoy no te toca ninguno' : 'Sin hábitos todavía'} texto={habitos.length ? 'Disfruta el día libre. Mañana sigues.' : 'Crea tu primer hábito con el botón "+ Hábito" de arriba. Uno solo, el más fácil.'} />
        )}
      </div>

      <div className="seccion">
        <div className="seccion-cab">
          <h2 className="titulo">Pendientes personales</h2>
          <button className="btn pequeno suave" onClick={() => abrir(undefined, { area: 'personal' })}>+ Nuevo pendiente</button>
        </div>
        {pendientesHoy.length ? (
          <div className="tlista">
            {pendientesHoy.map((t) => (
              <FilaTarea
                key={t.id}
                tarea={t}
                ahora={ahora}
                alAbrir={() => abrir(t.id)}
                alAlternar={() => cumplir(t, { alHecha: () => reaccionar('Un pendiente menos. Lo personal también cuenta.', 'contenta') })}
              />
            ))}
          </div>
        ) : (
          <Vacio titulo="Sin pendientes personales" texto="Trámites, llamadas, compras: anótalos con el botón de arriba para no cargarlos en la cabeza." />
        )}
      </div>

      {pendientesAcademicos > 0 && (
        <button className="enlace-modo" onClick={() => cambiar({ modo: 'academico' })}>
          <span>Académico · {pendientesAcademicos} {pendientesAcademicos === 1 ? 'tarea urgente' : 'tareas urgentes'}</span>
          <span>Ir →</span>
        </button>
      )}

      <Hoja titulo="Nuevo hábito" abierta={nuevoHabito} alCerrar={() => setNuevoHabito(false)}>
        {nuevoHabito && (
          <FormHabito
            alGuardar={(h) => {
              guardarHabito(h)
              setNuevoHabito(false)
              avisar(`Hábito agregado: ${h.nombre}.`)
            }}
            alCerrar={() => setNuevoHabito(false)}
          />
        )}
      </Hoja>
      {nodo}
      {ejecutor.nodo}
    </section>
  )
}
