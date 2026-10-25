import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCuenta } from '../cuenta/CuentaProvider'
import { useAviso } from '../ui/Aviso'
import { DictadoFinanzas } from './DictadoFinanzas'
import { FormMovimiento } from './FormMovimiento'
import { fechaLocal, normalizarConfig } from './modelo'
import { rangoPeriodo } from './periodos'
import type { RepoFinanzas } from './repo'
import { FILTROS_INICIALES, type Filtros } from './resumen'
import type { Config, Medio, Meta, Movimiento, Periodo } from './tipos'
import { calcularXPFinanzas, estadoAlpiFinanzas, totalXPFinanzas, type EstadoAlpiFinanzas, type XPFinanzas } from './xp'

// El estado de Finanstia: lo que se está viendo (periodo, billetera, filtros) y lo que llega de la base de datos.
// Solo existe mientras estás en Finanstia: al salir se dejan de escuchar los datos.

const TODO = { desde: '0000-01-01', hasta: '9999-12-31' }
const CLAVE_MONTOS = 'astia.finanzas.ocultarMontos'

export interface OpcionesFormulario {
  mov?: Movimiento
  tipo?: 'gasto' | 'ingreso' | 'transferencia'
  /** Datos para rellenar un movimiento nuevo (por ejemplo, lo que se entendió al dictar). */
  previo?: { tipo: 'gasto' | 'ingreso' | 'transferencia'; monto?: number; categoria?: string | null; medio?: Medio; origen?: Medio; fecha?: string; nota?: string }
}

export interface Finanzas {
  /** La base de datos; cada escritura avisa para que la experiencia de Alpi se actualice. */
  datos: RepoFinanzas
  config: Config
  /** null mientras llegan. */
  movs: Movimiento[] | null
  /** Movimientos del mes calendario actual (todos los medios): presupuesto y avisos. */
  movsMes: Movimiento[]
  metas: Meta[] | null
  /** Todo el historial; solo se pide cuando el filtro "Todo el historial" está activo. */
  historial: Movimiento[] | null
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  medio: Medio
  setMedio: (m: Medio) => void
  filtros: Filtros
  setFiltros: (f: Filtros) => void
  montosOcultos: boolean
  alternarMontos: () => void
  abrirFormulario: (op?: OpcionesFormulario) => void
  /** El Alpi de Finanstia: su experiencia y su nivel (se calculan de todos tus movimientos). */
  alpi: { xp: XPFinanzas; total: number; estado: EstadoAlpiFinanzas; cargado: boolean }
  /** Abre la pantalla para dictar un movimiento. */
  abrirDictado: () => void
  /** Sube cada vez que tú cambias algo (para recalcular la experiencia de Alpi). */
  version: number
  /** Para mostrar el error de una operación sin que se cierre la pantalla. */
  alFallar: (err: unknown) => void
  /** Ir a otra pestaña de Finanstia (con filtros opcionales para Movimientos). */
  irA: (pestana: 'hoy' | 'movimientos' | 'presupuesto' | 'metas', filtros?: Filtros) => void
}

const FinanzasContext = createContext<Finanzas | null>(null)
export function useFinanzas(): Finanzas {
  const f = useContext(FinanzasContext)
  if (!f) throw new Error('useFinanzas se usa dentro de <FinanzasProvider>')
  return f
}

const ESCRITURAS = ['crearMovimiento', 'actualizarMovimiento', 'eliminarMovimiento', 'restaurarMovimientos', 'crearTransferencia', 'actualizarTransferencia', 'guardarCategorias', 'definirPresupuesto', 'recalcularSaldos', 'crearMeta', 'actualizarMeta', 'eliminarMeta', 'restaurarMeta', 'aportarAMeta'] as const

function conAviso(repo: RepoFinanzas, alEscribir: () => void): RepoFinanzas {
  const envuelto = { ...repo } as RepoFinanzas
  for (const nombre of ESCRITURAS) {
    const original = repo[nombre] as (...args: unknown[]) => unknown
    ;(envuelto as unknown as Record<string, unknown>)[nombre] = (...args: unknown[]) => {
      const r = original(...args)
      alEscribir()
      return r
    }
  }
  return envuelto
}

/** Como useFinanzas, pero devuelve null fuera de Finanstia (para la barra de abajo y el encabezado). */
export const useFinanzasOpcional = (): Finanzas | null => useContext(FinanzasContext)

export function mensajeDe(err: unknown): string {
  const e = err as { code?: string; message?: string } | null
  if (e?.code === 'permission-denied') return 'Firebase no te dejó guardar. Revisa las reglas de seguridad en la consola de Firebase.'
  if (e?.code === 'unavailable') return 'Sin conexión: se guardará cuando vuelva la señal.'
  return e?.message || 'No se pudo completar. Inténtalo otra vez.'
}

export function FinanzasProvider({ irA, children }: { irA: Finanzas['irA']; children: ReactNode }) {
  const { repo: repoBase } = useCuenta()
  const avisar = useAviso()
  const [version, setVersion] = useState(0)
  const [config, setConfig] = useState<Config>(() => normalizarConfig())
  const [movs, setMovs] = useState<Movimiento[] | null>(null)
  const [movsMes, setMovsMes] = useState<Movimiento[]>([])
  const [metas, setMetas] = useState<Meta[] | null>(null)
  const [historial, setHistorial] = useState<Movimiento[] | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>(() => ({ tipo: 'mes', ref: fechaLocal() }))
  const [medio, setMedio] = useState<Medio>('digital')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES)
  const [formulario, setFormulario] = useState<OpcionesFormulario | null>(null)
  const [dictando, setDictando] = useState(false)
  const [todos, setTodos] = useState<Movimiento[] | null>(null)
  const [montosOcultos, setMontosOcultos] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_MONTOS) === '1'
    } catch {
      return false
    }
  })
  const errorMostrado = useRef(false)

  const alFallar = useCallback((err: unknown) => avisar(mensajeDe(err), 'error'), [avisar])
  // Un error de carga se muestra una sola vez (si no, cada reintento lo repetiría)
  const errorCarga = useCallback(
    (err: Error) => {
      if (errorMostrado.current) return
      errorMostrado.current = true
      alFallar(err)
    },
    [alFallar],
  )

  const datos = useMemo(() => (repoBase ? conAviso(repoBase, () => setVersion((v) => v + 1)) : null), [repoBase])

  useEffect(() => {
    document.documentElement.dataset.montos = montosOcultos ? 'ocultos' : 'visibles'
    return () => {
      delete document.documentElement.dataset.montos
    }
  }, [montosOcultos])
  const alternarMontos = useCallback(() => {
    setMontosOcultos((o) => {
      try {
        localStorage.setItem(CLAVE_MONTOS, o ? '0' : '1')
      } catch {
        /* sin almacenamiento */
      }
      return !o
    })
  }, [])

  // Configuración (saldos, categorías, topes), metas y el mes actual: siempre
  const mes = rangoPeriodo('mes', fechaLocal())
  useEffect(() => {
    if (!repoBase) return
    const cortar = [
      repoBase.escucharConfig(setConfig, errorCarga),
      repoBase.escucharMetas(setMetas, errorCarga),
      repoBase.escucharMovimientos(mes.desde, mes.hasta, setMovsMes, errorCarga),
    ]
    return () => cortar.forEach((f) => f())
  }, [repoBase, mes.desde, mes.hasta, errorCarga])

  // El periodo que estás viendo
  const { desde, hasta } = rangoPeriodo(periodo.tipo, periodo.ref)
  useEffect(() => {
    if (!repoBase) return
    setMovs(null)
    return repoBase.escucharMovimientos(desde, hasta, setMovs, errorCarga)
  }, [repoBase, desde, hasta, errorCarga])

  // "Todo el historial": solo mientras el filtro está activo
  useEffect(() => {
    if (!repoBase || !filtros.historial) return
    setHistorial(null)
    const cortar = repoBase.escucharMovimientos(TODO.desde, TODO.hasta, setHistorial, errorCarga)
    return () => {
      cortar()
      setHistorial(null)
    }
  }, [repoBase, filtros.historial, errorCarga])

  // La experiencia de Alpi sale de todos tus movimientos: se leen una vez y de nuevo cuando algo cambia
  useEffect(() => {
    if (!datos) return
    let vigente = true
    datos
      .todosLosMovimientos()
      .then((m) => vigente && setTodos(m))
      .catch(() => {
        /* sin conexión o sin permiso: se queda con lo último que se leyó */
      })
    return () => {
      vigente = false
    }
  }, [datos, version, movsMes])
  const alpi = useMemo(() => {
    const xp = calcularXPFinanzas({ movs: todos ?? [], metas: metas ?? [], config, hoy: fechaLocal() })
    const total = totalXPFinanzas(xp)
    return { xp, total, estado: estadoAlpiFinanzas(total), cargado: todos !== null }
  }, [todos, metas, config])

  const abrirDictado = useCallback(() => setDictando(true), [])
  const cerrarDictado = useCallback(() => setDictando(false), [])
  const abrirFormulario = useCallback((op: OpcionesFormulario = {}) => setFormulario(op), [])
  const cerrarFormulario = useCallback(() => setFormulario(null), [])

  const valor = useMemo<Finanzas | null>(
    () =>
      datos && {
        datos,
        config,
        movs,
        movsMes,
        metas,
        historial,
        periodo,
        setPeriodo,
        medio,
        setMedio,
        filtros,
        setFiltros,
        montosOcultos,
        alternarMontos,
        abrirFormulario,
        abrirDictado,
        alpi,
        version,
        alFallar,
        irA,
      },
    [datos, config, movs, movsMes, metas, historial, periodo, medio, filtros, montosOcultos, alternarMontos, abrirFormulario, abrirDictado, alpi, version, alFallar, irA],
  )

  if (!valor) return null
  return (
    <FinanzasContext.Provider value={valor}>
      {children}
      <FormMovimiento opciones={formulario} alCerrar={cerrarFormulario} />
      <DictadoFinanzas abierto={dictando} alCerrar={cerrarDictado} />
    </FinanzasContext.Provider>
  )
}
