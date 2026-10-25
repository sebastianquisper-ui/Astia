import type { PreferenciasVoz } from './voz'
// Cuándo suena Astia y qué sonido tiene cada momento por defecto.

export type EventoSonido = 'evolucion' | 'tareaHecha' | 'enfoqueFin' | 'descansoFin' | 'vista2020' | 'metaCumplida'

export interface InfoEvento {
  id: EventoSonido
  nombre: string
  detalle: string
  /** El sonido predeterminado: el id de un preset. */
  predeterminado: string
}

export const EVENTOS: InfoEvento[] = [
  { id: 'evolucion', nombre: 'Cuando Alpi evoluciona', detalle: 'Al tocar "Evolucionar" en la celebración', predeterminado: 'alpi' },
  { id: 'tareaHecha', nombre: 'Cuando cumples una tarea o un hábito', detalle: 'Al entregar tu evidencia o marcar un hábito', predeterminado: 'campanita' },
  { id: 'enfoqueFin', nombre: 'Cuando termina un enfoque', detalle: 'El fin de un Pomodoro o de un bloque de estudio', predeterminado: 'campana' },
  { id: 'descansoFin', nombre: 'Cuando termina un descanso', detalle: 'Para volver a empezar', predeterminado: 'ding' },
  { id: 'vista2020', nombre: 'Para descansar la vista', detalle: 'El recordatorio 20-20-20', predeterminado: 'gota' },
  { id: 'metaCumplida', nombre: 'Cuando cumples una meta de ahorro', detalle: 'En Finanstia', predeterminado: 'tada' },
]

export const eventoPorId = (id: string): InfoEvento | undefined => EVENTOS.find((e) => e.id === id)

/** Lo que se guarda en los ajustes. */
export interface PreferenciasSonido {
  /** Interruptor general (por defecto sí). */
  activo?: boolean
  /** Qué suena en cada momento: el id de un preset, 'silencio' o 'propio'. Lo que falte usa el predeterminado. */
  eventos?: Partial<Record<EventoSonido, string>>
  /** Los sonidos que subiste tú (el archivo está en el teléfono; aquí solo su nombre). */
  propios?: Partial<Record<EventoSonido, { nombre: string }>>
  /** Alpi lee los avisos en voz alta. */
  voz?: PreferenciasVoz
}

export const SILENCIO = 'silencio'
export const PROPIO = 'propio'
