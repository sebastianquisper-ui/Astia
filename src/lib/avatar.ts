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

/** "Ana, " o nada: sin nombre la frase sigue sonando natural. */
const vocativo = (nombre: string) => (nombre.trim() ? `${nombre.trim()}, ` : '')

const rotar = (frases: string[], semilla: number) => frases[semilla % frases.length]

/** La frase cambia cada día pero no cada vez que abres la app. */
export function fraseDe(s: Situacion, nombre: string, semilla: number): string {
  const animo = animoDe(s)
  if (animo === 'durmiendo') return rotar([`${vocativo(nombre)}ya es tarde. Duerme. Mañana empezamos temprano.`, 'Pantalla fuera. Descansar también es parte del plan.'], semilla)
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
    nombre.trim() ? `No hay excusas, ${nombre.trim()}.` : 'No hay excusas.',
    'Diez minutos. Solo diez. Ya.',
    'El celular no te va a hacer la tarea.',
    `${vocativo(nombre)}¿cuál es la siguiente tarea? Esa. Ahora.`,
    'Tocarme no cuenta como estudiar.',
  ]
}

// ---------- Mi Órbita (modo personal) ----------

export interface SituacionPersonal {
  hora: number
  /** Ya hay hábitos creados. */
  hayHabitos: boolean
  /** Pendientes personales vencidos. */
  vencidas: number
  habitosHechos: number
  habitosTotal: number
  /** La racha más larga entre tus hábitos de hoy. */
  rachaMax: number
  /** Nombre de la rutina de este momento del día, si no la has hecho. */
  rutinaPendiente?: string
}

export function animoPersonal(s: SituacionPersonal): Animo {
  if (s.hora >= 23 || s.hora < 5) return 'durmiendo'
  if (s.vencidas > 0) return 'alerta'
  if (s.habitosTotal > 0 && s.habitosHechos === s.habitosTotal) return 'contenta'
  return 'seria'
}

export function frasePersonal(s: SituacionPersonal, nombre: string, semilla: number): string {
  const animo = animoPersonal(s)
  if (animo === 'durmiendo') return rotar([`${vocativo(nombre)}a dormir. Dormir bien también es un hábito.`, 'Pantalla fuera. Mañana cumples mejor descansado.'], semilla)
  if (!s.hayHabitos) return 'Aún no tienes hábitos. Crea el primero: uno solo, el más fácil, y lo cumples hoy.'
  if (animo === 'alerta') {
    const que = s.vencidas === 1 ? 'Tienes 1 pendiente personal vencido' : `Tienes ${s.vencidas} pendientes personales vencidos`
    return rotar([`${que}. Lo personal también cuenta. Hazlo hoy.`, `${que}. No se resuelve solo. Empieza ya.`], semilla)
  }
  if (animo === 'contenta') {
    const racha = s.rachaMax >= 3 ? ` Racha de ${s.rachaMax} días.` : ''
    return rotar([`Todos tus hábitos de hoy, cumplidos.${racha} Descansa sin culpa.`, `Hoy cumpliste contigo.${racha} Eso es disciplina.`], semilla)
  }
  if (s.rutinaPendiente) return rotar([`Tu ${s.rutinaPendiente} sigue pendiente. Empieza ya.`, `Hora de tu ${s.rutinaPendiente}. Sin negociar.`], semilla)
  const faltan = s.habitosTotal - s.habitosHechos
  const cuantos = faltan === 1 ? 'Te falta 1 hábito' : `Te faltan ${faltan} hábitos`
  return rotar([`${cuantos} de hoy. Empieza por el más corto.`, `${cuantos}. La versión mínima también cuenta.`], semilla)
}

export function frasesToquePersonal(nombre: string): string[] {
  return [
    'Un hábito no se cumple mirando la pantalla.',
    `${vocativo(nombre)}la versión mínima también vale. Empieza con eso.`,
    'Cinco minutos. Solo cinco. Ya.',
    'Tu yo de la próxima semana te lo va a agradecer.',
    'La motivación no llega sola: llega cuando ya empezaste.',
    'Tocarme no cuenta como ejercicio.',
  ]
}
