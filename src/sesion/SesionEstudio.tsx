import { useEffect, useReducer, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Tarea } from '../dominio/tipos'
import { useDatos } from '../datos/DatosProvider'
import type { Fase } from '../lib/metodos'
import { registrarSesion } from '../lib/sesiones'
import { AvatarMascota } from '../mascotas/AvatarMascota'
import { Icono } from '../ui/Icono'
import { sonar } from '../sonidos/reproductor'

const R = 104
const C = 2 * Math.PI * R
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

interface Props {
  titulo: string
  /** Para anotar con qué método estudiaste (ver lib/sesiones). */
  metodoId?: string
  fases: Fase[]
  tarea?: Tarea
  esPomodoro?: boolean
  esArranque?: boolean
  descansoMin: number
  /** Solo en "10 minutos": el método que Astia sugiere para seguir. */
  siguiente?: { nombre: string; alSeguir: () => void }
  alMarcarHecha?: () => void
  alCerrar: () => void
}

/** Sesión guiada a pantalla completa: recorre las fases del método con su temporizador. */
export function SesionEstudio({ titulo, metodoId, fases, tarea, esPomodoro, esArranque, descansoMin, siguiente, alMarcarHecha, alCerrar }: Props) {
  const { registrarMinutos } = useDatos()
  const [, dibujar] = useReducer((n: number) => n + 1, 0)
  // Todo el estado del reloj vive en una referencia: así el intervalo siempre ve el valor actual
  const S = useRef({ idx: 0, corriendo: true, fin: Date.now() + fases[0].minutos * 60_000, restante: 0, terminada: false, enfoqueMin: 0 })
  const s = S.current

  // Al cerrar la sesión (de cualquier forma) queda anotada: hora, método y si llegaste al final
  const inicio = useRef(new Date().toISOString())
  useEffect(
    () => () => {
      registrarSesion({ inicio: inicio.current, metodo: metodoId ?? 'otro', tareaId: tarea?.id, enfoqueMin: s.enfoqueMin, completa: s.terminada })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Registra lo que llevas de la fase actual (minutos enteros) y devuelve cuánto era
  const registrarFase = (entera: boolean) => {
    const fase = fases[s.idx]
    const total = fase.minutos * 60_000
    const resto = entera ? 0 : Math.max(0, s.corriendo ? s.fin - Date.now() : s.restante)
    const minutos = Math.round((total - resto) / 60_000)
    if (minutos <= 0) return
    if (fase.tipo === 'enfoque') {
      registrarMinutos({ enfoque: minutos, pomodoros: entera && esPomodoro && fase.minutos >= 20 ? 1 : 0 })
      s.enfoqueMin += minutos
    } else {
      registrarMinutos({ descanso: minutos })
    }
  }

  const terminarFase = (entera: boolean) => {
    registrarFase(entera)
    void sonar(fases[s.idx].tipo === 'enfoque' ? 'enfoqueFin' : 'descansoFin')
    if (s.idx < fases.length - 1) {
      s.idx += 1
      s.fin = Date.now() + fases[s.idx].minutos * 60_000
      s.corriendo = true
    } else {
      s.terminada = true
      s.corriendo = false
    }
    dibujar()
  }

  // El tiempo se calcula con la hora real: sigue exacto aunque la pantalla se apague un momento
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!s.corriendo || s.terminada) return
      if (s.fin - Date.now() <= 0) terminarFase(true)
      else dibujar()
    }, 250)
    return () => window.clearInterval(id)
  })

  // Mantiene la pantalla encendida mientras estudias (si el teléfono lo permite)
  useEffect(() => {
    let candado: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((c) => (candado = c)).catch(() => {})
    return () => void candado?.release().catch(() => {})
  }, [])

  // La página de atrás no se mueve ni se cierra con Escape sin querer
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [])

  const pausarOSeguir = () => {
    if (s.corriendo) {
      s.restante = Math.max(0, s.fin - Date.now())
      s.corriendo = false
    } else {
      s.fin = Date.now() + s.restante
      s.corriendo = true
    }
    dibujar()
  }

  const salir = () => {
    if (!s.terminada) registrarFase(false) // lo que alcanzaste a hacer cuenta
    alCerrar()
  }

  const fase = fases[s.idx]
  const total = fase.minutos * 60_000
  const resto = s.terminada ? 0 : s.corriendo ? Math.max(0, s.fin - Date.now()) : s.restante
  const progreso = s.terminada ? 1 : 1 - resto / total

  return createPortal(
    <div className={'sesion' + (fase.tipo === 'descanso' && !s.terminada ? ' descanso' : '')} role="dialog" aria-modal="true" aria-label={`Sesión: ${titulo}`}>
      <button className="icono-btn sesion-cerrar" onClick={salir} aria-label="Cerrar sesión">
        <Icono nombre="cerrar" tam={20} />
      </button>

      {!s.terminada ? (
        <>
          <p className="sub">
            {titulo}
            {tarea ? ` · ${tarea.titulo}` : ''}
          </p>
          <h2 className="sesion-fase">{fase.etiqueta}</h2>
          <p className="sub">{esArranque ? 'Una sola cosa' : `Paso ${s.idx + 1} de ${fases.length}`}</p>

          <div className="sesion-anillo" role="timer" aria-label={`${fase.etiqueta}: quedan ${mmss(resto)}`}>
            <svg viewBox="0 0 240 240">
              <circle className="sesion-pista" cx="120" cy="120" r={R} />
              <circle className="sesion-avance" cx="120" cy="120" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - progreso)} transform="rotate(-90 120 120)" />
            </svg>
            <b>{mmss(resto)}</b>
          </div>

          <p className="sesion-desc">{fase.descripcion}</p>

          <div className="acciones sesion-acciones">
            <button className="btn" onClick={pausarOSeguir}>{s.corriendo ? 'Pausar' : 'Seguir'}</button>
            <button className="btn suave" onClick={() => terminarFase(false)}>{s.idx === fases.length - 1 ? 'Terminar' : 'Saltar paso'}</button>
          </div>

          {fases.length > 1 && (
            <ol className="sesion-pasos" aria-label="Pasos del método">
              {fases.map((p, i) => (
                <li key={i} className={i < s.idx ? 'hecho' : i === s.idx ? 'actual' : ''}>
                  <span>{p.etiqueta}</span>
                  <small>{p.minutos} min</small>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="sesion-fin">
          <AvatarMascota animo="contenta" tam={104} />
          <h2 className="sesion-fase">{esArranque ? 'Ya empezaste' : 'Sesión terminada'}</h2>
          <p className="sesion-desc">
            {esArranque
              ? `Diez minutos cumplidos. Ya empezaste, lo difícil pasó.${siguiente ? ` Sigue con ${siguiente.nombre}.` : ''}`
              : `Sesión de ${titulo} terminada. Descansa ${descansoMin} minutos, ni uno más.`}
          </p>
          {s.enfoqueMin > 0 && <p className="sub">Enfoque de esta sesión: {s.enfoqueMin} min</p>}
          <div className="acciones sesion-acciones" style={{ flexDirection: 'column' }}>
            {siguiente && <button className="btn" onClick={siguiente.alSeguir}>Seguir con {siguiente.nombre}</button>}
            {alMarcarHecha && <button className="btn suave" onClick={() => { alMarcarHecha(); alCerrar() }}>Marcar la tarea como hecha</button>}
            <button className="btn suave" onClick={alCerrar}>Cerrar</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
