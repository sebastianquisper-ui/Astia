// Estado de ánimo y frases de Astia. Tono: estricta, directa, sin excusas (español peruano neutro).

export type Animo = 'seria' | 'alerta' | 'contenta' | 'durmiendo'

export interface Situacion {
  hora: number
  hayCursos: boolean
  /** Tareas pendientes que ya pasaron su fecha. */
  vencidas: number
  /** Tareas de tu lista de hoy que faltan. */
  porHacer: number
  /** Tareas de tu lista de hoy que ya cumpliste. */
  hechas: number
}

export function animoDe(s: Situacion): Animo {
  if (s.hora >= 23 || s.hora < 5) return 'durmiendo'
  if (s.vencidas > 0) return 'alerta'
  if (s.hechas > 0 && s.porHacer === 0) return 'contenta'
  return 'seria'
}

const rotar = (frases: string[], semilla: number) => frases[semilla % frases.length]

/** La frase cambia cada día pero no cada vez que abres la app. */
export function fraseDe(s: Situacion, nombre: string, semilla: number): string {
  const animo = animoDe(s)
  if (animo === 'durmiendo') return rotar([`${nombre}, ya es tarde. Duerme. Mañana empezamos temprano.`, 'Pantalla fuera. Descansar también es parte del plan.'], semilla)
  if (!s.hayCursos) return 'Aún no me diste tus cursos ni tu horario. Cárgalos ahora y empezamos.'
  if (animo === 'alerta') {
    const n = s.vencidas
    const que = n === 1 ? 'Tienes 1 pendiente vencida' : `Tienes ${n} pendientes vencidas`
    return rotar([`${que}. No se resuelven solas. Empieza por la más antigua.`, `${que}. Cada hora que pasa cuesta más. Empieza ya.`], semilla)
  }
  if (animo === 'contenta') return rotar(['Hoy cumpliste. Descansa con límite y deja listo mañana.', 'Lista de hoy completa. Bien. Antes de dormir, planifica mañana.'], semilla)
  if (s.porHacer > 0) return rotar([`Hoy toca cumplir ${s.porHacer}. Empieza con 10 minutos y no discutas.`, `Tu lista de hoy tiene ${s.porHacer}. Nada de "luego". Abre la primera.`], semilla)
  return 'No hay nada pendiente. Aprovecha: adelanta algo o repasa un tema.'
}

/** Lo que dice cuando la tocas. */
export function frasesToque(nombre: string): string[] {
  return [
    'Deja de mirarme y empieza.',
    `No hay excusas, ${nombre}.`,
    'Diez minutos. Solo diez. Ya.',
    'El celular no te va a hacer la tarea.',
    `${nombre}, ¿cuál es la siguiente tarea? Esa. Ahora.`,
    'Tocarme no cuenta como estudiar.',
  ]
}
