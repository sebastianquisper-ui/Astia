import { esTransferencia } from './modelo'
import { ahorradoEnMeta } from './modelo'
import type { Config, Medio, Meta, Movimiento } from './tipos'
import { gastosPorCategoria, totales } from './resumen'
import { rangoPeriodo } from './periodos'
import { nivel } from './presupuesto'

// La experiencia del Alpi de Finanstia. Es propia (no se mezcla con la del Alpi de estudios y vida personal) y se calcula
// siempre de tus movimientos: nunca se guarda, y gastar NO da puntos. Se gana anotando, ahorrando y cumpliendo.

export const PUNTOS_FINANZAS = {
  /** Cada día en que anotaste al menos un movimiento (máximo 1 por día, así no se puede inflar). */
  diaRegistrado: 2,
  /** Cada aporte a una meta. */
  aporte: 4,
  /** Cada meta cumplida. */
  metaCumplida: 30,
  /** Cada mes cerrado en que ingresaste más de lo que gastaste. */
  mesEquilibrado: 15,
  /** Cada mes cerrado sin pasarte de ningún tope del presupuesto. */
  mesEnPresupuesto: 20,
} as const

/** Con esto: nivel 2 a las 2 o 3 semanas anotando todo, nivel 3 a los 2 o 3 meses, nivel 4 a los 5 o 6 meses. */
export const UMBRALES_FINANZAS = [0, 50, 200, 500]

export interface XPFinanzas {
  constancia: number
  ahorro: number
  metas: number
  meses: number
}

export const totalXPFinanzas = (xp: XPFinanzas): number => xp.constancia + xp.ahorro + xp.metas + xp.meses

export function calcularXPFinanzas({ movs, metas, config, hoy }: { movs: Movimiento[]; metas: Meta[]; config: Config; hoy: string }): XPFinanzas {
  const xp: XPFinanzas = { constancia: 0, ahorro: 0, metas: 0, meses: 0 }
  const propios = movs.filter((m) => !esTransferencia(m) && m.fecha <= hoy)

  xp.constancia = new Set(propios.map((m) => m.fecha)).size * PUNTOS_FINANZAS.diaRegistrado

  for (const meta of metas) {
    xp.ahorro += (meta.aportes ?? []).filter((a) => a.monto > 0).length * PUNTOS_FINANZAS.aporte
    if (meta.objetivo > 0 && ahorradoEnMeta(meta) >= meta.objetivo) xp.metas += PUNTOS_FINANZAS.metaCumplida
  }

  // Meses ya cerrados (antes del mes actual) que tienen movimientos
  const mesActual = hoy.slice(0, 7)
  const porMes = new Map<string, Movimiento[]>()
  for (const m of propios) {
    const mes = m.fecha.slice(0, 7)
    if (mes < mesActual) porMes.set(mes, [...(porMes.get(mes) ?? []), m])
  }
  const hayTopes = (['digital', 'efectivo'] as Medio[]).some((medio) => Object.keys(config.presupuestos[medio] ?? {}).length > 0)
  for (const delMes of porMes.values()) {
    const t = totales(delMes)
    if (t.ingresos > 0 && t.ingresos >= t.gastos) xp.meses += PUNTOS_FINANZAS.mesEquilibrado
    if (hayTopes && !pasoAlgunTope(delMes, config)) xp.meses += PUNTOS_FINANZAS.mesEnPresupuesto
  }
  return xp
}

function pasoAlgunTope(delMes: Movimiento[], config: Config): boolean {
  for (const medio of ['digital', 'efectivo'] as Medio[]) {
    const topes = config.presupuestos[medio] ?? {}
    for (const { categoria, total } of gastosPorCategoria(delMes.filter((m) => m.medio === medio))) {
      if (nivel(total, topes[categoria]) === 'excedido') return true
    }
  }
  return false
}

export interface EstadoAlpiFinanzas {
  /** 0 a 3. */
  indice: number
  nivel: 1 | 2 | 3 | 4
  xpInicio: number
  xpSiguiente: number | null
  progreso: number
}

export function estadoAlpiFinanzas(total: number): EstadoAlpiFinanzas {
  let indice = 0
  UMBRALES_FINANZAS.forEach((u, i) => {
    if (total >= u) indice = i
  })
  const siguiente = indice < UMBRALES_FINANZAS.length - 1 ? UMBRALES_FINANZAS[indice + 1] : null
  const inicio = UMBRALES_FINANZAS[indice]
  return { indice, nivel: (indice + 1) as 1 | 2 | 3 | 4, xpInicio: inicio, xpSiguiente: siguiente, progreso: siguiente === null ? 1 : Math.min(1, (total - inicio) / (siguiente - inicio)) }
}

/** Mes siguiente a este, para mostrar cuándo se cierra el mes en curso. */
export const finDeMes = (hoy: string): string => rangoPeriodo('mes', hoy).hasta
