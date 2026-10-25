import { aFecha } from './periodos'
import { aCentimos, ahorradoEnMeta } from './modelo'
import type { Meta } from './tipos'

// Meses de ahorro que quedan hasta la fecha límite (mínimo 1 si aún no vence).
export function mesesHasta(hoy: string, limite: string): number {
  if (limite < hoy) return 0
  const h = aFecha(hoy)
  const l = aFecha(limite)
  const meses = (l.getFullYear() - h.getFullYear()) * 12 + (l.getMonth() - h.getMonth()) - (l.getDate() < h.getDate() ? 1 : 0)
  return Math.max(1, meses)
}

export interface ProgresoMeta {
  ahorrado: number
  faltante: number
  cumplida: boolean
  pct: number
  porMes: number | null
  vencida: boolean
}

export function progresoMeta(meta: Pick<Meta, 'aportes' | 'objetivo' | 'limite'>, hoy: string): ProgresoMeta {
  const ahorrado = ahorradoEnMeta(meta)
  const faltante = Math.max(0, (aCentimos(meta.objetivo) - aCentimos(ahorrado)) / 100)
  const cumplida = faltante === 0
  const pct = Math.min(1, ahorrado / meta.objetivo)
  let porMes: number | null = null
  let vencida = false
  if (meta.limite && !cumplida) {
    const meses = mesesHasta(hoy, meta.limite)
    if (meses === 0) vencida = true
    else porMes = Math.ceil((faltante * 100) / meses) / 100
  }
  return { ahorrado, faltante, cumplida, pct, porMes, vencida }
}

export const ordenarMetas = (metas: Meta[]): Meta[] => [...metas].sort((a, b) => (a.creado ?? 0) - (b.creado ?? 0))
