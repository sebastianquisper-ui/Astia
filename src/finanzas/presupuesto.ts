import { aCentimos } from './modelo'
import { deMedio, gastosPorCategoria } from './resumen'
import type { Config, Medio, Movimiento } from './tipos'

export const UMBRAL_ALERTA = 0.7

export type NivelPresupuesto = 'ok' | 'alerta' | 'excedido'

// 'ok' por debajo de 70 %, 'alerta' de 70 % a 99 %, 'excedido' desde 100 %.
export function nivel(gastado: number, tope: number | null | undefined): NivelPresupuesto | null {
  if (!tope) return null
  const pct = gastado / tope
  if (pct >= 1) return 'excedido'
  if (pct >= UMBRAL_ALERTA) return 'alerta'
  return 'ok'
}

export interface FilaPresupuesto {
  categoria: string
  gastado: number
  tope: number | null
  nivel: NivelPresupuesto | null
  restante: number | null
}

export interface EstadoPresupuesto {
  filas: FilaPresupuesto[]
  total: { gastado: number; tope: number; nivel: NivelPresupuesto | null; restante: number }
}

// movsMes: movimientos del mes calendario actual (todos los medios).
export function estadoPresupuesto(movsMes: Movimiento[], config: Config, medio: Medio): EstadoPresupuesto {
  const topes = config.presupuestos[medio] ?? {}
  const gastos = new Map(gastosPorCategoria(deMedio(movsMes, medio)).map((g) => [g.categoria, g.total]))
  const categorias = [...config.categoriasGasto]
  for (const c of [...Object.keys(topes), ...gastos.keys()]) if (!categorias.includes(c)) categorias.push(c)

  const filas: FilaPresupuesto[] = categorias.map((categoria) => {
    const gastado = gastos.get(categoria) ?? 0
    const tope = topes[categoria] ?? null
    return { categoria, gastado, tope, nivel: nivel(gastado, tope), restante: tope ? (aCentimos(tope) - aCentimos(gastado)) / 100 : null }
  })

  const conTope = filas.filter((f) => f.tope)
  const gastado = conTope.reduce((s, f) => s + aCentimos(f.gastado), 0) / 100
  const tope = conTope.reduce((s, f) => s + aCentimos(f.tope as number), 0) / 100
  return { filas, total: { gastado, tope, nivel: nivel(gastado, tope), restante: (aCentimos(tope) - aCentimos(gastado)) / 100 } }
}

export function alertas(estado: EstadoPresupuesto): FilaPresupuesto[] {
  return estado.filas.filter((f) => f.nivel === 'alerta' || f.nivel === 'excedido')
}

export interface AvisoGasto {
  categoria: string
  gastado: number
  tope: number
  nivel: NivelPresupuesto
  pct: number
}

// Tras guardar un gasto del mes actual: ¿su categoría llegó al 70 % o al 100 %?
// movsMes todavía no incluye el cambio; `anterior` es el movimiento antes de editarlo.
export function avisoTrasGasto(movsMes: Movimiento[], config: Config, gasto: Pick<Movimiento, 'medio' | 'categoria' | 'tipo' | 'monto'>, anterior: Pick<Movimiento, 'id'> | null = null): AvisoGasto | null {
  const tope = config.presupuestos[gasto.medio]?.[gasto.categoria]
  if (!tope || gasto.tipo !== 'gasto') return null
  let cent = 0
  for (const m of movsMes) {
    if (m.id === anterior?.id || m.transferId) continue
    if (m.tipo === 'gasto' && m.medio === gasto.medio && m.categoria === gasto.categoria) cent += aCentimos(m.monto)
  }
  cent += aCentimos(gasto.monto)
  const gastado = cent / 100
  const n = nivel(gastado, tope)
  if (n === 'ok' || n === null) return null
  return { categoria: gasto.categoria, gastado, tope, nivel: n, pct: Math.round((gastado / tope) * 100) }
}
