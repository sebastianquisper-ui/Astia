import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { COLOR_BARRA, ESCALA_LETRA, temaEfectivo, type ModoTema, type TamanoLetra } from '../lib/tema'
import { guardarLocal, leerLocal } from '../lib/almacen'
import { useAviso } from '../ui/Aviso'

// Ajustes de vista. En la fase 2 se sincronizarán con la nube (tabla `profiles`);
// por ahora viven en el teléfono.
/** Académico = universidad. Personal = Mi Órbita (hábitos, rutinas, pendientes personales). */
export type Modo = 'academico' | 'personal'

export interface Ajustes {
  modo: Modo
  nombre: string
  modoTema: ModoTema
  tamanoLetra: TamanoLetra
  /** Muestra cursos, clases y tareas inventados para ver cómo luce la app. */
  datosEjemplo: boolean
}

const CLAVE = 'astia.ajustes'
const INICIALES: Ajustes = { nombre: 'Sebastián', modoTema: 'hora', tamanoLetra: 'normal', datosEjemplo: true, modo: 'academico' }

interface Contexto {
  ajustes: Ajustes
  cambiar: (parcial: Partial<Ajustes>) => void
}
const AjustesContext = createContext<Contexto>({ ajustes: INICIALES, cambiar: () => {} })
export const useAjustes = () => useContext(AjustesContext)

export function AjustesProvider({ children }: { children: ReactNode }) {
  const avisar = useAviso()
  // Se mezcla con los valores iniciales por si el teléfono tiene guardada una versión vieja
  const [ajustes, setAjustes] = useState<Ajustes>(() => ({ ...INICIALES, ...leerLocal<Partial<Ajustes>>(CLAVE, {}) }))
  const [minuto, setMinuto] = useState(0)

  // El modo "hora" cambia solo al amanecer/anochecer: revisamos cada minuto
  useEffect(() => {
    if (ajustes.modoTema !== 'hora') return
    const id = window.setInterval(() => setMinuto((m) => m + 1), 60_000)
    return () => window.clearInterval(id)
  }, [ajustes.modoTema])

  const tema = useMemo(() => temaEfectivo(ajustes.modoTema), [ajustes.modoTema, minuto])

  // Aplica tema y tamaño de letra al documento
  useEffect(() => {
    const raiz = document.documentElement
    raiz.setAttribute('data-theme', tema)
    raiz.setAttribute('data-modo', ajustes.modo)
    raiz.style.fontSize = 16 * ESCALA_LETRA[ajustes.tamanoLetra] + 'px'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema])
  }, [tema, ajustes.tamanoLetra, ajustes.modo])

  const cambiar = useCallback(
    (parcial: Partial<Ajustes>) => {
      setAjustes((previo) => {
        // Siempre se crea un objeto nuevo (nunca se modifica el anterior)
        const nuevo = { ...previo, ...parcial }
        if (!guardarLocal(CLAVE, nuevo)) {
          avisar('No se pudo guardar el ajuste en este teléfono.', 'error')
        }
        return nuevo
      })
    },
    [avisar],
  )

  const valor = useMemo(() => ({ ajustes, cambiar }), [ajustes, cambiar])
  return <AjustesContext.Provider value={valor}>{children}</AjustesContext.Provider>
}
