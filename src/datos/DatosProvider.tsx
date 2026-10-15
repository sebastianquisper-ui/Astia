import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Clase, Curso, Tarea } from '../dominio/tipos'
import { CLASES_EJEMPLO, CURSOS_EJEMPLO, tareasEjemplo } from '../demo/datosEjemplo'
import { useAjustes } from '../ajustes/AjustesProvider'

// Fuente de datos de las pantallas. Por ahora usa los datos de ejemplo (o nada);
// en la fase 2 se reemplaza por la base de datos sin tocar las pantallas.

interface Datos {
  cursos: Curso[]
  clases: Clase[]
  /** Tareas tal como están ahora (con lo que marcaste como hecho). */
  tareas: Tarea[]
  /** Tareas originales, sin tus marcas. Sirve para armar "tus 3 de hoy" una sola vez. */
  tareasBase: Tarea[]
  hayDatos: boolean
  alternar: (id: string) => void
}

const VACIO: Datos = { cursos: [], clases: [], tareas: [], tareasBase: [], hayDatos: false, alternar: () => {} }
const DatosContext = createContext<Datos>(VACIO)
export const useDatos = () => useContext(DatosContext)

export function DatosProvider({ children }: { children: ReactNode }) {
  const { ajustes } = useAjustes()
  const [marcas, setMarcas] = useState<Record<string, string | null>>({}) // id -> hecha (ISO) o reabierta (null)

  const base = useMemo(() => (ajustes.datosEjemplo ? tareasEjemplo(new Date()) : []), [ajustes.datosEjemplo])

  const tareas = useMemo(
    () =>
      base.map((t) => {
        if (!(t.id in marcas)) return t
        const m = marcas[t.id]
        // Siempre se crea una tarea nueva: nunca se modifica la original
        return m ? { ...t, estado: 'hecha' as const, hechaEn: m } : { ...t, estado: 'pendiente' as const, hechaEn: undefined }
      }),
    [base, marcas],
  )

  const alternar = useCallback(
    (id: string) => {
      const actual = tareas.find((t) => t.id === id)
      if (!actual) return
      setMarcas((previo) => ({ ...previo, [id]: actual.estado === 'hecha' ? null : new Date().toISOString() }))
    },
    [tareas],
  )

  const valor = useMemo<Datos>(
    () =>
      ajustes.datosEjemplo
        ? { cursos: CURSOS_EJEMPLO, clases: CLASES_EJEMPLO, tareas, tareasBase: base, hayDatos: true, alternar }
        : VACIO,
    [ajustes.datosEjemplo, tareas, base, alternar],
  )
  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>
}
