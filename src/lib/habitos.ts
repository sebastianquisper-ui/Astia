import type { Frecuencia, Habito } from '../dominio/tipos'
import { DIAS_CORTOS, addDays, indiceDia, lunesDe, parseYmd, ymd } from './fechas'

// Lógica del tracker de hábitos: qué días toca, rachas y cumplimiento.
// Todo recibe la fecha de "hoy" como parámetro para poder probarlo.

const TOPE = 3700 // días máximos que se miran hacia atrás (10 años)

export function textoFrecuencia(f: Frecuencia): string {
  if (f.tipo === 'diaria') return 'Todos los días'
  if (f.tipo === 'dias') return f.dias.map((d) => DIAS_CORTOS[d]).join(', ')
  return f.veces === 1 ? '1 vez por semana' : `${f.veces} veces por semana`
}

export const cumplido = (h: Habito, fecha: Date | string): boolean => h.registro.includes(typeof fecha === 'string' ? fecha : ymd(fecha))

/** ¿Ese día "toca" el hábito? Los semanales no tienen día fijo: cualquier día sirve. */
export function tocaEse(h: Habito, fecha: Date): boolean {
  if (h.frecuencia.tipo === 'dias') return h.frecuencia.dias.includes(indiceDia(fecha))
  return true
}

/** Cuántas veces lo cumpliste en la semana (lunes a domingo) de `fecha`. */
export function vecesEnSemana(h: Habito, fecha: Date): number {
  const lunes = lunesDe(fecha)
  const dias = new Set(Array.from({ length: 7 }, (_, i) => ymd(addDays(lunes, i))))
  return h.registro.filter((f) => dias.has(f)).length
}

/** ¿Debe aparecer hoy en "Hábitos de hoy"? Un semanal deja de aparecer cuando ya cumpliste su meta de la semana. */
export function tocaHoy(h: Habito, hoy: Date): boolean {
  if (h.frecuencia.tipo === 'semanal') return cumplido(h, hoy) || vecesEnSemana(h, hoy) < h.frecuencia.veces
  return tocaEse(h, hoy)
}

export interface Racha {
  n: number
  unidad: 'días' | 'semanas'
}

/**
 * Racha actual.
 * - Diaria o por días: cuenta los días cumplidos seguidos. Los días en que no toca no la rompen,
 *   y el día de hoy sin cumplir todavía tampoco (aún estás a tiempo).
 * - Semanal: cuenta semanas seguidas en que llegaste a tu meta; la semana en curso no rompe nada.
 */
export function rachaDe(h: Habito, hoy: Date): Racha {
  if (h.frecuencia.tipo === 'semanal') {
    let n = 0
    for (let sem = 0; sem < 600; sem++) {
      const dia = addDays(hoy, -7 * sem)
      if (vecesEnSemana(h, dia) >= h.frecuencia.veces) n++
      else if (sem === 0) continue
      else break
    }
    return { n, unidad: 'semanas' }
  }
  let n = 0
  for (let i = 0; i < TOPE; i++) {
    const dia = addDays(hoy, -i)
    if (cumplido(h, dia)) n++
    else if (i === 0 || !tocaEse(h, dia)) continue
    else break
  }
  return { n, unidad: 'días' }
}

/** La racha más larga de toda la historia del hábito (en la misma unidad que `rachaDe`). */
export function mejorRacha(h: Habito, hoy: Date): Racha {
  if (!h.registro.length) return { n: 0, unidad: h.frecuencia.tipo === 'semanal' ? 'semanas' : 'días' }
  const primero = parseYmd(h.registro[0])
  if (h.frecuencia.tipo === 'semanal') {
    let mejor = 0
    let actual = 0
    for (let lunes = lunesDe(primero); lunes <= hoy; lunes = addDays(lunes, 7)) {
      if (vecesEnSemana(h, lunes) >= h.frecuencia.veces) {
        actual++
        mejor = Math.max(mejor, actual)
      } else if (ymd(lunes) !== ymd(lunesDe(hoy))) actual = 0
    }
    return { n: mejor, unidad: 'semanas' }
  }
  let mejor = 0
  let actual = 0
  for (let dia = primero; dia <= hoy; dia = addDays(dia, 1)) {
    if (cumplido(h, dia)) {
      actual++
      mejor = Math.max(mejor, actual)
    } else if (tocaEse(h, dia) && ymd(dia) !== ymd(hoy)) actual = 0
  }
  return { n: mejor, unidad: 'días' }
}

export type EstadoDia = 'hecho' | 'falto' | 'hoy' | 'libre' | 'futuro'

/** Los 7 días de la semana de `hoy` (lunes a domingo) con su estado, para los puntitos del tracker. */
export function semanaDe(h: Habito, hoy: Date, semanaDesde: Date = hoy): { fecha: Date; estado: EstadoDia }[] {
  const lunes = lunesDe(semanaDesde)
  const hoyYmd = ymd(hoy)
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = addDays(lunes, i)
    const k = ymd(fecha)
    let estado: EstadoDia
    if (cumplido(h, k)) estado = 'hecho'
    else if (k > hoyYmd) estado = 'futuro'
    else if (k === hoyYmd) estado = 'hoy'
    else estado = h.frecuencia.tipo === 'dias' && tocaEse(h, fecha) ? 'falto' : h.frecuencia.tipo === 'diaria' ? 'falto' : 'libre'
    return { fecha, estado }
  })
}

/** Cuántos hábitos de hoy llevas cumplidos. */
export function cumplimientoDeHoy(habitos: Habito[], hoy: Date): { hechos: number; total: number } {
  const deHoy = habitos.filter((h) => tocaHoy(h, hoy))
  return { hechos: deHoy.filter((h) => cumplido(h, hoy)).length, total: deHoy.length }
}

/** Porcentaje (0 a 100) de lo que te tocaba en los últimos 30 días y cumpliste. */
export function cumplimiento30(h: Habito, hoy: Date): number {
  const desde = ymd(addDays(hoy, -29))
  const hechos = h.registro.filter((f) => f >= desde && f <= ymd(hoy)).length
  let esperados: number
  if (h.frecuencia.tipo === 'semanal') esperados = Math.round((h.frecuencia.veces * 30) / 7)
  else esperados = Array.from({ length: 30 }, (_, i) => addDays(hoy, -i)).filter((d) => tocaEse(h, d)).length
  return esperados === 0 ? 0 : Math.min(100, Math.round((hechos / esperados) * 100))
}
