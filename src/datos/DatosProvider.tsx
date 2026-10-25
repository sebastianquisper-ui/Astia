import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Apunte, Recordatorio, Clase, Curso, Datos, Evidencia, Habito, Mejora, PlanDia, Perfil, ProgresoDia, Rutina, SemanaTema, Tarea } from '../dominio/tipos'
import { datosDeEjemplo } from '../demo/datosEjemplo'
import { useAjustes } from '../ajustes/AjustesProvider'
import { guardarLocal } from '../lib/almacen'
import { useAviso } from '../ui/Aviso'
import { ymd } from '../lib/fechas'
import { activos, sumarMinutos, type MinutosSesion, alternarHabito, alternarRutina, alternarTarea, borrarRegistro, datosVacios, guardarRegistro, normalizarDatos, quitarCurso } from './almacenamiento'
import { crearRespaldo, type Importacion } from './respaldo'
import { useCuenta } from '../cuenta/CuentaProvider'
import { reemplazarDatos } from './nube/registros'
import { useSincronizacion, type EstadoNube } from './useSincronizacion'

// Fuente de datos de TODAS las pantallas. Hoy guarda en el teléfono (localStorage);
// en la parte 2b se sincroniza con Supabase sin tocar las pantallas.
// Con "datos de ejemplo" activos, trabaja sobre un juego de datos inventados en memoria
// (se puede editar para probar, pero no se guarda).

const CLAVE = 'astia.datos.v2'

function cargar(): Datos {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return datosVacios()
    try {
      return normalizarDatos(JSON.parse(crudo))
    } catch {
      // Guardado dañado: lo apartamos en vez de perderlo
      localStorage.setItem(CLAVE + '.roto', crudo)
      return datosVacios()
    }
  } catch {
    return datosVacios()
  }
}

export interface Contexto {
  perfil: Perfil
  cursos: Curso[]
  clases: Clase[]
  tareas: Tarea[]
  semanas: SemanaTema[]
  habitos: Habito[]
  rutinas: Rutina[]
  mejoras: Mejora[]
  planes: PlanDia[]
  recordatorios: Recordatorio[]
  apuntes: Apunte[]
  progreso: ProgresoDia[]
  /** Estado de la copia en tu cuenta: 'local' = solo en este teléfono. */
  nube: EstadoNube
  /** Hay algo cargado (cursos o tareas). */
  hayDatos: boolean
  /** Estás viendo los datos de ejemplo, no los tuyos. */
  enEjemplo: boolean
  /** Reabre una tarea hecha, o la marca hecha con su evidencia (sin evidencia no se marca). */
  alternar: (id: string, evidencia?: Evidencia) => void
  guardarRecordatorio: (r: Recordatorio) => void
  borrarRecordatorio: (id: string) => void
  guardarApunte: (a: Apunte) => void
  borrarApunte: (id: string) => void
  guardarTarea: (t: Tarea) => void
  borrarTarea: (id: string) => void
  guardarCurso: (c: Curso) => void
  borrarCurso: (id: string) => void
  guardarSemana: (s: SemanaTema) => void
  borrarSemana: (id: string) => void
  guardarClase: (c: Clase) => void
  borrarClase: (id: string) => void
  /** Marca o desmarca un hábito. Sin fecha, es hoy. */
  alternarHabito: (id: string, fecha?: string) => void
  guardarHabito: (h: Habito) => void
  borrarHabito: (id: string) => void
  guardarRutina: (r: Rutina) => void
  borrarRutina: (id: string) => void
  /** Marca o desmarca una rutina como cumplida hoy. */
  alternarRutina: (id: string) => void
  guardarPerfil: (cambios: Partial<Omit<Perfil, 'actualizadoEn'>>) => void
  /** Suma minutos de enfoque o descanso al progreso de hoy. */
  registrarMinutos: (suma: MinutosSesion) => void
  importar: (r: Extract<Importacion, { ok: true }>) => void
  exportar: () => string
}

const DatosContext = createContext<Contexto | null>(null)
export function useDatos(): Contexto {
  const c = useContext(DatosContext)
  if (!c) throw new Error('useDatos se usa dentro de <DatosProvider>')
  return c
}

export function DatosProvider({ children }: { children: ReactNode }) {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const [reales, setReales] = useState<Datos>(cargar)
  const [demo, setDemo] = useState<Datos>(() => datosDeEjemplo(new Date()))
  const { sync, usuario } = useCuenta()
  const enEjemplo = ajustes.datosEjemplo
  const datos = enEjemplo ? demo : reales

  // Guarda lo tuyo en el teléfono cada vez que cambia (los datos de ejemplo no se guardan)
  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    if (!guardarLocal(CLAVE, reales)) avisar('No se pudieron guardar tus datos en este teléfono. Exporta un respaldo ahora.', 'error')
  }, [reales, avisar])

  const nube = useSincronizacion({ sync, uid: usuario?.uid ?? null, dueno: usuario?.correo || usuario?.uid || null, reales, setReales })

  const editar = useCallback((fn: (d: Datos) => Datos) => (enEjemplo ? setDemo : setReales)((previo) => fn(previo)), [enEjemplo])

  const valor = useMemo<Contexto>(() => {
    const ahora = () => Date.now()
    return {
      perfil: datos.perfil,
      cursos: activos(datos.cursos),
      clases: activos(datos.clases),
      tareas: activos(datos.tareas),
      semanas: activos(datos.semanas),
      habitos: activos(datos.habitos),
      rutinas: activos(datos.rutinas),
      mejoras: activos(datos.mejoras),
      planes: activos(datos.planes),
      recordatorios: activos(datos.recordatorios),
      apuntes: activos(datos.apuntes),
      progreso: activos(datos.progreso),
      nube,
      hayDatos: activos(datos.cursos).length > 0 || activos(datos.tareas).length > 0 || activos(datos.habitos).length > 0,
      enEjemplo,
      alternar: (id, evidencia) => editar((d) => alternarTarea(d, id, new Date(), evidencia)),
      guardarRecordatorio: (r) => editar((d) => ({ ...d, recordatorios: guardarRegistro(d.recordatorios, r, ahora()) })),
      borrarRecordatorio: (id) => editar((d) => ({ ...d, recordatorios: borrarRegistro(d.recordatorios, id, ahora()) })),
      guardarApunte: (a) => editar((d) => ({ ...d, apuntes: guardarRegistro(d.apuntes, a, ahora()) })),
      borrarApunte: (id) => editar((d) => ({ ...d, apuntes: borrarRegistro(d.apuntes, id, ahora()) })),
      guardarTarea: (t) => editar((d) => ({ ...d, tareas: guardarRegistro(d.tareas, t, ahora()) })),
      borrarTarea: (id) => editar((d) => ({ ...d, tareas: borrarRegistro(d.tareas, id, ahora()) })),
      guardarCurso: (c) => editar((d) => ({ ...d, cursos: guardarRegistro(d.cursos, c, ahora()) })),
      borrarCurso: (id) => editar((d) => quitarCurso(d, id, ahora())),
      guardarSemana: (s) => editar((d) => ({ ...d, semanas: guardarRegistro(d.semanas, s, ahora()) })),
      borrarSemana: (id) => editar((d) => ({ ...d, semanas: borrarRegistro(d.semanas, id, ahora()) })),
      guardarClase: (c) => editar((d) => ({ ...d, clases: guardarRegistro(d.clases, c, ahora()) })),
      borrarClase: (id) => editar((d) => ({ ...d, clases: borrarRegistro(d.clases, id, ahora()) })),
      alternarHabito: (id, fecha) => editar((d) => alternarHabito(d, id, fecha ?? ymd(new Date()), ahora())),
      guardarHabito: (h) => editar((d) => ({ ...d, habitos: guardarRegistro(d.habitos, h, ahora()) })),
      borrarHabito: (id) => editar((d) => ({ ...d, habitos: borrarRegistro(d.habitos, id, ahora()) })),
      guardarRutina: (r) => editar((d) => ({ ...d, rutinas: guardarRegistro(d.rutinas, r, ahora()) })),
      borrarRutina: (id) => editar((d) => ({ ...d, rutinas: borrarRegistro(d.rutinas, id, ahora()) })),
      alternarRutina: (id) => editar((d) => alternarRutina(d, id, ymd(new Date()), ahora())),
      registrarMinutos: (suma) => editar((d) => ({ ...d, progreso: sumarMinutos(d.progreso, ymd(new Date()), suma, ahora()) })),
      guardarPerfil: (cambios) => editar((d) => ({ ...d, perfil: { ...d.perfil, ...cambios, actualizadoEn: ahora() } })),
      importar: (r) => {
        setReales((previo) => reemplazarDatos(previo, r.datos, Date.now())) // lo que no viene en el respaldo queda borrado también en la nube
        cambiar({ ...r.ajustes, etapa: r.ajustes.etapa ?? 'universidad', datosEjemplo: false }) // al traer tus datos, se ocultan los de ejemplo
      },
      exportar: () => crearRespaldo(reales),
    }
  }, [datos, enEjemplo, editar, reales, cambiar, nube])

  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>
}
