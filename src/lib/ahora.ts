import type { Clase } from '../dominio/tipos'
import { addDays, conHora, indiceDia } from './fechas'

export interface EstadoAhora {
  tipo: 'en-clase' | 'proxima' | 'ninguna'
  clase?: Clase
  inicio?: Date
  fin?: Date
  /** En clase: minutos que faltan para que termine. Próxima: minutos que faltan para que empiece. */
  minutos: number
  /** 0 a 1. En clase: lo avanzado. Próxima: se llena a medida que se acerca (últimas 3 h). */
  progreso: number
}

const NINGUNA: EstadoAhora = { tipo: 'ninguna', minutos: 0, progreso: 0 }

/** Dice si estás en clase o cuál es la siguiente (mirando hasta 7 días adelante). */
export function claseAhora(clases: Clase[], ahora: Date = new Date()): EstadoAhora {
  for (let desfase = 0; desfase <= 7; desfase++) {
    const dia = addDays(ahora, desfase)
    const delDia = clases
      .filter((c) => c.dia === indiceDia(dia))
      .map((clase) => ({ clase, inicio: conHora(dia, clase.inicio), fin: conHora(dia, clase.fin) }))
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())

    for (const c of delDia) {
      if (ahora >= c.inicio && ahora < c.fin) {
        const total = c.fin.getTime() - c.inicio.getTime()
        return {
          tipo: 'en-clase',
          ...c,
          minutos: Math.ceil((c.fin.getTime() - ahora.getTime()) / 6e4),
          progreso: (ahora.getTime() - c.inicio.getTime()) / total,
        }
      }
      if (c.inicio > ahora) {
        const falta = Math.ceil((c.inicio.getTime() - ahora.getTime()) / 6e4)
        return { tipo: 'proxima', ...c, minutos: falta, progreso: 1 - Math.min(1, falta / 180) }
      }
    }
  }
  return NINGUNA
}

/** Cuenta regresiva legible: 35 -> {n:"35",u:"min"}, 80 -> {n:"1:20",u:"h"}, 3000 -> {n:"2",u:"días"} */
export function formatoCuenta(minutos: number): { n: string; u: string } {
  if (minutos < 60) return { n: String(minutos), u: 'min' }
  if (minutos < 1440) return { n: `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`, u: 'h' }
  const dias = Math.floor(minutos / 1440)
  return { n: String(dias), u: dias === 1 ? 'día' : 'días' }
}
