import type { Tarea } from '../dominio/tipos'
import { DIAS, diffDays, fechaCorta, indiceDia, parseYmd } from './fechas'

// Semáforo de urgencia (misma regla de la v1):
// rojo < 48 h, ámbar esta semana, verde después, vencida aparte.
export type Urgencia = 'hecha' | 'vencida' | 'roja' | 'ambar' | 'verde'

/** Momento exacto en que vence. Sin hora, vence a las 23:59. */
export function venceEn(t: Tarea): number {
  const d = parseYmd(t.fecha)
  if (t.hora) {
    const [h, m] = t.hora.split(':').map(Number)
    d.setHours(h, m || 0, 0, 0)
  } else {
    d.setHours(23, 59, 0, 0)
  }
  return d.getTime()
}

export function urgenciaDe(t: Tarea, ahora: Date = new Date()): Urgencia {
  if (t.estado === 'hecha') return 'hecha'
  const diff = venceEn(t) - ahora.getTime()
  if (diff < 0) return 'vencida'
  if (diff < 48 * 36e5) return 'roja'
  if (diff < 7 * 864e5) return 'ambar'
  return 'verde'
}

/** Texto corto del plazo: "Hoy 21:00", "Mañana 15:00", "Vencida hace 2 d"... */
export function textoVence(t: Tarea, ahora: Date = new Date()): string {
  if (t.estado === 'hecha') return 'Hecha'
  const dias = diffDays(parseYmd(t.fecha), new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()))
  const hora = t.hora ? ' ' + t.hora : ''
  if (urgenciaDe(t, ahora) === 'vencida') return dias === 0 ? 'Venció hoy' + hora : `Vencida hace ${-dias} d`
  if (dias === 0) return 'Hoy' + hora
  if (dias === 1) return 'Mañana' + hora
  if (dias < 7) return DIAS[indiceDia(parseYmd(t.fecha))] + hora
  return fechaCorta(parseYmd(t.fecha)) + hora
}

/** Días que lleva vencida la tarea pendiente más antigua (0 si no hay ninguna vencida). */
export function diasDeAtraso(tareas: Tarea[], ahora: Date = new Date()): number {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  return Math.max(0, ...tareas.filter((t) => urgenciaDe(t, ahora) === 'vencida').map((t) => diffDays(hoy, parseYmd(t.fecha))))
}

/** Más urgente primero (las vencidas quedan arriba porque su fecha es la más antigua). */
export const porUrgencia = (a: Tarea, b: Tarea) => venceEn(a) - venceEn(b)
