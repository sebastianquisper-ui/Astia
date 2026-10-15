import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Clase, Curso, Datos, Meta, Mejora, PlanDia, Perfil, ProgresoDia, SemanaTema, Tarea } from '../dominio/tipos'
import { datosDeEjemplo } from '../demo/datosEjemplo'
import { useAjustes } from '../ajustes/AjustesProvider'
import { guardarLocal } from '../lib/almacen'
import { useAviso } from '../ui/Aviso'
import { activos, alternarTarea, borrarRegistro, datosVacios, guardarRegistro, normalizarDatos, quitarCurso } from './almacenamiento'
import { crearRespaldo, type Importacion } from './respaldo'

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
  metas: Meta[]
  mejoras: Mejora[]
  planes: PlanDia[]
  progreso: ProgresoDia[]
  /** Hay algo cargado (cursos o tareas). */
  hayDatos: boolean
  /** Estás viendo los datos de ejemplo, no los tuyos. */
  enEjemplo: boolean
  alternar: (id: string) => void
  guardarTarea: (t: Tarea) => void
  borrarTarea: (id: string) => void
  guardarCurso: (c: Curso) => void
  borrarCurso: (id: string) => void
  guardarClase: (c: Clase) => void
  borrarClase: (id: string) => void
  guardarPerfil: (cambios: Partial<Omit<Perfil, 'actualizadoEn'>>) => void
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

  const editar = useCallback((fn: (d: Datos) => Datos) => (enEjemplo ? setDemo : setReales)((previo) => fn(previo)), [enEjemplo])

  const valor = useMemo<Contexto>(() => {
    const ahora = () => Date.now()
    return {
      perfil: datos.perfil,
      cursos: activos(datos.cursos),
      clases: activos(datos.clases),
      tareas: activos(datos.tareas),
      semanas: activos(datos.semanas),
      metas: activos(datos.metas),
      mejoras: activos(datos.mejoras),
      planes: activos(datos.planes),
      progreso: activos(datos.progreso),
      hayDatos: activos(datos.cursos).length > 0 || activos(datos.tareas).length > 0,
      enEjemplo,
      alternar: (id) => editar((d) => alternarTarea(d, id, new Date())),
      guardarTarea: (t) => editar((d) => ({ ...d, tareas: guardarRegistro(d.tareas, t, ahora()) })),
      borrarTarea: (id) => editar((d) => ({ ...d, tareas: borrarRegistro(d.tareas, id, ahora()) })),
      guardarCurso: (c) => editar((d) => ({ ...d, cursos: guardarRegistro(d.cursos, c, ahora()) })),
      borrarCurso: (id) => editar((d) => quitarCurso(d, id, ahora())),
      guardarClase: (c) => editar((d) => ({ ...d, clases: guardarRegistro(d.clases, c, ahora()) })),
      borrarClase: (id) => editar((d) => ({ ...d, clases: borrarRegistro(d.clases, id, ahora()) })),
      guardarPerfil: (cambios) => editar((d) => ({ ...d, perfil: { ...d.perfil, ...cambios, actualizadoEn: ahora() } })),
      importar: (r) => {
        setReales(r.datos)
        cambiar({ ...r.ajustes, datosEjemplo: false }) // al traer tus datos, se ocultan los de ejemplo
      },
      exportar: () => crearRespaldo(reales),
    }
  }, [datos, enEjemplo, editar, reales, cambiar])

  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>
}
