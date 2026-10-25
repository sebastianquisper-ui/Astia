import { aCentimos, esTransferencia } from './modelo'
import type { Medio, Movimiento, TipoMov } from './tipos'
import type { GrupoTendencia } from './periodos'

export interface Filtros {
  tipo: 'todos' | TipoMov
  categoria: string | null
  texto: string
  historial: boolean
}
export const FILTROS_INICIALES: Filtros = { tipo: 'todos', categoria: null, texto: '', historial: false }

// Cálculos del periodo. Las transferencias no cuentan en ingresos, gastos, balance ni gráficos.

export const deMedio = (movs: Movimiento[], medio: Medio): Movimiento[] => movs.filter((m) => m.medio === medio)

export const sinTransferencias = (movs: Movimiento[]): Movimiento[] => movs.filter((m) => !esTransferencia(m))

export interface Totales {
  ingresos: number
  gastos: number
  balance: number
}

export function totales(movs: Movimiento[]): Totales {
  let ingresos = 0
  let gastos = 0
  for (const m of sinTransferencias(movs)) {
    if (m.tipo === 'ingreso') ingresos += aCentimos(m.monto)
    else gastos += aCentimos(m.monto)
  }
  return { ingresos: ingresos / 100, gastos: gastos / 100, balance: (ingresos - gastos) / 100 }
}

export function gastosPorCategoria(movs: Movimiento[]): { categoria: string; total: number }[] {
  const porCategoria = new Map<string, number>()
  for (const m of sinTransferencias(movs)) {
    if (m.tipo !== 'gasto') continue
    porCategoria.set(m.categoria, (porCategoria.get(m.categoria) ?? 0) + aCentimos(m.monto))
  }
  return [...porCategoria]
    .map(([categoria, cent]) => ({ categoria, total: cent / 100 }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, 'es'))
}

export function tendencia(movs: Movimiento[], grupos: GrupoTendencia[]): { ingresos: number[]; gastos: number[] } {
  const ingresos = grupos.map(() => 0)
  const gastos = grupos.map(() => 0)
  for (const m of sinTransferencias(movs)) {
    const i = grupos.findIndex((g) => g.desde <= m.fecha && m.fecha <= g.hasta)
    if (i < 0) continue
    if (m.tipo === 'ingreso') ingresos[i] += aCentimos(m.monto)
    else gastos[i] += aCentimos(m.monto)
  }
  return { ingresos: ingresos.map((c) => c / 100), gastos: gastos.map((c) => c / 100) }
}

export function ordenarRecientes(movs: Movimiento[]): Movimiento[] {
  return [...movs].sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : (b.creado ?? 0) - (a.creado ?? 0)))
}

export interface GrupoDia {
  fecha: string
  movs: Movimiento[]
  soloTransferencias: boolean
  neto: number
}

// Grupos por día (más reciente primero) con el neto del día sin transferencias.
export function agruparPorDia(movs: Movimiento[]): GrupoDia[] {
  const grupos: { fecha: string; movs: Movimiento[]; netoCent: number; soloTransferencias: boolean }[] = []
  for (const m of ordenarRecientes(movs)) {
    let grupo = grupos.at(-1)
    if (!grupo || grupo.fecha !== m.fecha) {
      grupo = { fecha: m.fecha, movs: [], netoCent: 0, soloTransferencias: true }
      grupos.push(grupo)
    }
    grupo.movs.push(m)
    if (!esTransferencia(m)) {
      grupo.soloTransferencias = false
      grupo.netoCent += m.tipo === 'ingreso' ? aCentimos(m.monto) : -aCentimos(m.monto)
    }
  }
  return grupos.map(({ netoCent, ...g }) => ({ ...g, neto: netoCent / 100 }))
}

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

// Busca en nota, categoría o monto ("12,5" encuentra 12.50).
export function buscar(movs: Movimiento[], texto: string): Movimiento[] {
  const q = normalizar(texto.trim())
  if (!q) return movs
  const qMonto = q.replace(',', '.')
  return movs.filter(
    (m) => normalizar(m.categoria).includes(q) || normalizar(m.nota ?? '').includes(q) || m.monto.toFixed(2).includes(qMonto) || String(m.monto).includes(qMonto),
  )
}

export function filtrar(movs: Movimiento[], { tipo = 'todos', categoria = null, texto = '' }: Partial<Filtros> = {}): Movimiento[] {
  let res = movs
  if (tipo !== 'todos') res = res.filter((m) => m.tipo === tipo && !esTransferencia(m))
  if (categoria) res = res.filter((m) => m.categoria === categoria)
  return buscar(res, texto)
}

export interface Comparacion {
  a: Totales
  b: Totales
  difGasto: number
  porCategoria: { categoria: string; a: number; b: number; dif: number }[]
}

// Comparación de dos periodos: totales, diferencia de gasto (A − B) y diferencia por categoría.
export function compararPeriodos(movsA: Movimiento[], movsB: Movimiento[]): Comparacion {
  const a = totales(movsA)
  const b = totales(movsB)
  const catA = new Map(gastosPorCategoria(movsA).map((g) => [g.categoria, g.total]))
  const catB = new Map(gastosPorCategoria(movsB).map((g) => [g.categoria, g.total]))
  const categorias = [...new Set([...catA.keys(), ...catB.keys()])]
  const porCategoria = categorias
    .map((categoria) => {
      const ga = catA.get(categoria) ?? 0
      const gb = catB.get(categoria) ?? 0
      return { categoria, a: ga, b: gb, dif: (aCentimos(ga) - aCentimos(gb)) / 100 }
    })
    .sort((x, y) => Math.abs(y.dif) - Math.abs(x.dif) || x.categoria.localeCompare(y.categoria, 'es'))
  return { a, b, difGasto: (aCentimos(a.gastos) - aCentimos(b.gastos)) / 100, porCategoria }
}
