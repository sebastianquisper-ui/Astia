import { useEffect, useRef, useState } from 'react'
import type { Tarea } from '../dominio/tipos'
import { metodoPorId, sugerirMetodo } from '../lib/metodos'
import { useSesion } from '../sesion/useSesion'
import { Hoja } from '../ui/Hoja'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { useCumplirTarea } from '../formularios/Evidencia'
import { useEditorTarea } from '../formularios/EditorTarea'
import { animoDe, fraseDe, frasesToque, type Animo } from '../lib/avatar'
import { claseAhora } from '../lib/ahora'
import { diffDays, ymd } from '../lib/fechas'
import { cumplimientoDeHoy } from '../lib/habitos'
import { planDeHoy } from '../lib/plan'
import { saludoConNombre } from '../lib/saludo'
import { diasDeAtraso, urgenciaDe } from '../lib/urgencia'
import { HeroAstia } from '../mascotas/HeroAstia'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'
import { FilaTarea } from '../ui/FilaTarea'
import { TarjetaAhora } from '../ui/TarjetaAhora'
import { DictadoTarea } from '../formularios/DictadoTarea'
import { PreguntarAstia } from '../ui/PreguntarAstia'
import { useAhora } from '../ui/useAhora'
import { TarjetaRecomienda } from '../ui/TarjetaRecomienda'
import { Vacio } from '../ui/Vacio'

/** Hoy en modo Académico: clase actual, urgencias y tus 3 de hoy de la universidad. */
export function HoyAcademico() {
  const { ajustes, cambiar } = useAjustes()
  const { tareas, planes, cursos, clases, habitos, progreso } = useDatos()
  const cumplir = useCumplirTarea()
  const sesion = useSesion()
  const [menuEmpezar, setMenuEmpezar] = useState(false)
  const { abrir, nodo } = useEditorTarea()
  const [dictando, setDictando] = useState(false)
  const [preguntando, setPreguntando] = useState(false)
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

  const alternarTarea = (t: Tarea) => cumplir(t, { alHecha: () => celebrar(t.id), alReabrir: () => avisar('Tarea reabierta.') })
  const celebrar = (id: string) => {
    const faltan = plan.filter((t) => t.estado === 'pendiente' && t.id !== id).length
    const dijo = faltan === 0 && plan.some((t) => t.id === id) ? 'Plan de hoy cumplido. Eso sí.' : 'Una menos. Sigue con la siguiente.'
    setReaccion({ frase: dijo, animo: 'contenta' })
    hablarPor(1800)
    temporizadores.current.push(window.setTimeout(() => setReaccion(null), 3500))
    avisar('Hecha, con evidencia. ' + (faltan === 0 ? 'Cumpliste tu lista.' : `Te faltan ${faltan} de hoy.`))
  }

  const estado = claseAhora(clases, ahora)
  const curso = cursos.find((c) => c.id === estado.clase?.cursoId)
  const orbita = cumplimientoDeHoy(habitos, ahora)
  const enfoqueHoy = progreso.find((p) => p.fecha === ymd(ahora))?.enfoque ?? 0
  const porEmpezar = plan.filter((t) => t.estado === 'pendiente')

  return (
    <section className="pantalla">
      <h1 className="saludo">
        {saludoConNombre(ahora.getHours(), ajustes.nombre)}
      </h1>

      <HeroAstia animo={animo} habla={habla} frase={frase} alTocar={tocarAvatar} progreso={{ vencidas, diasAtraso: diasDeAtraso(pendientes, ahora), porHacer: situacion.porHacer, hechas: situacion.hechas }} baila={reaccion?.animo === 'contenta'} />

      <TarjetaAhora
        estado={estado}
        curso={curso}
        alEmpezar={() => setMenuEmpezar(true)}
        alDictar={() => setDictando(true)}
      />
      <button className="btn suave" style={{ width: '100%' }} onClick={() => setPreguntando(true)}>
        <Icono nombre="mic" tam={18} /> Pregúntale a Astia
      </button>
      <button className="btn suave" style={{ width: '100%' }} onClick={() => (window.location.hash = '#/mas/agenda')}>
        <Icono nombre="reloj" tam={18} /> Recordarme algo
      </button>

      <TarjetaRecomienda />

      {hayDatos && (
        <div className="chips">
          <span className={'chip' + (vencidas ? ' vencida' : '')}>{vencidas} {vencidas === 1 ? 'vencida' : 'vencidas'}</span>
          <span className={'chip' + (en48 ? ' roja' : '')}>{en48} en 48 h</span>
          <span className={'chip' + (semana ? ' ambar' : '')}>{semana} esta semana</span>
          {enfoqueHoy > 0 && <span className="chip verde">{enfoqueHoy} min de enfoque hoy</span>}
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
              <FilaTarea key={t.id} tarea={t} curso={cursos.find((c) => c.id === t.cursoId)} ahora={ahora} alAlternar={() => alternarTarea(t)} alAbrir={() => abrir(t.id)} />
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
      <Hoja titulo="Empezar ya" abierta={menuEmpezar} alCerrar={() => setMenuEmpezar(false)}>
        <p className="sub">Astia te propone un método según cada tarea. Si no tienes ganas, empieza con diez minutos.</p>
        <div className="acciones">
          <button className="btn" onClick={() => { setMenuEmpezar(false); sesion.iniciar('arranque', porEmpezar[0]?.id) }}>Solo 10 minutos para arrancar</button>
        </div>
        {porEmpezar.length > 0 && (
          <div className="lista" style={{ marginTop: 16 }}>
            {porEmpezar.map((t) => {
              const metodo = metodoPorId(sugerirMetodo(t, cursos.find((c) => c.id === t.cursoId)?.nombre))
              return (
                <button key={t.id} className="fila" onClick={() => { setMenuEmpezar(false); sesion.iniciar(metodo.id, t.id) }} aria-label={`Empezar ${t.titulo} con ${metodo.nombre}`}>
                  <span className="texto">
                    <b>{t.titulo}</b>
                    <span>Método sugerido: {metodo.nombre}</span>
                  </span>
                  <Icono nombre="play" tam={20} />
                </button>
              )
            })}
          </div>
        )}
        <div className="acciones">
          <button className="btn suave" onClick={() => { setMenuEmpezar(false); window.location.hash = '#/mas/enfoque' }}>Ver todos los métodos</button>
        </div>
      </Hoja>
      {sesion.nodo}
      {nodo}
      <PreguntarAstia abierto={preguntando} alCerrar={() => setPreguntando(false)} />
      <DictadoTarea abierto={dictando} alCerrar={() => setDictando(false)} alEntender={(plantilla) => abrir(undefined, plantilla)} />
    </section>
  )
}
