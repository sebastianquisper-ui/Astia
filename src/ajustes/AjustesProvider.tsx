import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ExpresionAlpi } from '../mascotas/alpi/datos'
import { configurarSonidos } from '../sonidos/reproductor'
import { configurarVoz } from '../sonidos/voz'
import { configurarMusica } from '../sonidos/musica'
import type { PreferenciasSonido } from '../sonidos/catalogo'
import type { Etapa } from '../lib/etapa'
import type { MascotaElegida } from '../lib/mascotas'
import { COLOR_BARRA, ESCALA_LETRA, temaEfectivo, type ModoTema, type TamanoLetra } from '../lib/tema'
import { guardarLocal, leerLocal } from '../lib/almacen'
import { useAviso } from '../ui/Aviso'

// Ajustes de vista. En la fase 2 se sincronizarán con la nube (tabla `profiles`);
// por ahora viven en el teléfono.
/** Académico = estudios. Personal = Mi Órbita (hábitos, rutinas, pendientes personales). Finanzas = Finanstia (tu plata). */
export type Modo = 'academico' | 'personal' | 'finanzas'

export interface Ajustes {
  modo: Modo
  /** Tu compañera: una de las 8 mascotas, o 'astia' (la estrella de siempre). */
  mascota: MascotaElegida
  /** Última etapa que viste de cada mascota (para celebrar cuando evoluciona). 0 = la primera. */
  mascotaVista: Record<string, number>
  /** Cómo vestiste a Alpi: nivel a mostrar (hasta el que alcanzaste) y qué accesorios lleva. */
  alpiLook?: { nivel?: number; accesorios?: Record<string, boolean>; expresion?: ExpresionAlpi }
  /** Lo mismo para el Alpi de Finanstia (es otro Alpi, con su propia ropa). */
  alpiLookFinanzas?: { nivel?: number; accesorios?: Record<string, boolean>; expresion?: ExpresionAlpi }
  /** Qué suena en cada momento (evolución, tarea cumplida, fin de enfoque…). Por defecto todo con su sonido predeterminado. */
  sonidos?: PreferenciasSonido
  /** Si quedó activado crear los recordatorios también en Google Calendar. */
  calendario?: { activo?: boolean }
  /** Alpi en 3D (por defecto sí). Apagado se ve dibujada: gasta menos batería. */
  alpi3d?: boolean
  /** Recordatorio 20-20-20 para descansar la vista (por defecto sí). */
  descansoVista?: boolean
  /** Colegio, preuniversitario o universidad. Sin elegir todavía = se le pregunta al abrir. */
  etapa?: Etapa
  /** Cómo llamas a tu periodo (Ciclo, Bimestre, Trimestre...). Vacío = el de tu etapa. */
  periodo?: string
  nombre: string
  modoTema: ModoTema
  tamanoLetra: TamanoLetra
  /** Muestra cursos, clases y tareas inventados para ver cómo luce la app. */
  datosEjemplo: boolean
}

const CLAVE = 'astia.ajustes'
const INICIALES: Ajustes = { nombre: '', modoTema: 'hora', tamanoLetra: 'normal', datosEjemplo: false, modo: 'academico', mascota: 'alpi', mascotaVista: {} }

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

  // Los sonidos se leen desde fuera de React (por ejemplo, al terminar un temporizador)
  useEffect(() => configurarSonidos(ajustes.sonidos), [ajustes.sonidos])
  useEffect(() => configurarMusica(ajustes.sonidos?.musica), [ajustes.sonidos?.musica])
  useEffect(() => configurarVoz(ajustes.sonidos?.voz), [ajustes.sonidos?.voz])

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
