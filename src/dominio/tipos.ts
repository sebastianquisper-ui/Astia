// Tipos del dominio de Astia. En la nube (Supabase) cada uno es una tabla con el mismo
// nombre de campos (en snake_case). Todos los registros llevan `actualizadoEn` y, si se
// borran, `borradoEn` ("lápida"): así la sincronización nunca pisa un cambio nuevo con uno viejo.

export type Area = 'universidad' | 'personal'
export type TipoTarea = 'tarea' | 'estudio' | 'examen'
export type Prioridad = 'alta' | 'media' | 'baja'

export interface Registro {
  /** Texto único generado en el teléfono (así se puede crear sin internet). */
  id: string
  /** Milisegundos desde 1970 de la última modificación. */
  actualizadoEn: number
  /** Si existe, el registro está borrado (se conserva la lápida para sincronizar). */
  borradoEn?: number
}

export interface Curso extends Registro {
  nombre: string
  color: string
}

/** Un bloque de clase semanal. `dia`: 0 = lunes ... 6 = domingo. Horas en formato "HH:MM". */
export interface Clase extends Registro {
  cursoId: string
  dia: number
  inicio: string
  fin: string
  aula: string
}

export interface Paso {
  texto: string
  hecho: boolean
}

export interface Tarea extends Registro {
  titulo: string
  area: Area
  /** Solo para tareas de la universidad. */
  cursoId: string | null
  /** Solo para tareas personales (Casa, Trámites, Familia...). */
  categoria?: string
  tipo: TipoTarea
  /** Fecha límite "AAAA-MM-DD". */
  fecha: string
  hora?: string
  prioridad: Prioridad
  pideEvidencia: boolean
  /** Método de estudio elegido (si no, Astia sugiere uno). */
  metodo?: string
  pasos: Paso[]
  estado: 'pendiente' | 'hecha'
  /** Momento en que se marcó hecha (ISO). */
  hechaEn?: string
  /** La prueba de que se hizo. Sin evidencia, una tarea no se puede marcar hecha. */
  evidencia?: Evidencia
}

/** Evidencia de una tarea: una foto (guardada aparte, en el teléfono) y/o el enlace de la entrega. */
export interface Evidencia {
  foto: boolean
  enlace?: string
  /** Cuándo se entregó (ISO). */
  fecha: string
}

/** Tema y notas de una semana del ciclo para un curso. */
export interface SemanaTema extends Registro {
  cursoId: string
  semana: number
  tema: string
  notas: string
}

/** Cada cuánto toca un hábito. `dias`: 0 = lunes ... 6 = domingo. */
export type Frecuencia =
  | { tipo: 'diaria' }
  | { tipo: 'dias'; dias: number[] }
  | { tipo: 'semanal'; veces: number }

/** Un hábito con su tracker. Pertenece a un apartado de Mi Órbita (Deporte, Salud, Mente...). */
export interface Habito extends Registro {
  nombre: string
  categoria: string
  color: string
  frecuencia: Frecuencia
  /** Versión mínima: lo que haces los días sin ganas ("solo 5 minutos"). */
  minimo?: string
  /** Fechas "AAAA-MM-DD" en que lo cumpliste. */
  registro: string[]
}

export interface PasoRutina {
  texto: string
  /** Ejemplo: "4 × 10" en un ejercicio, o "5 min". */
  detalle?: string
}

export type Momento = 'manana' | 'tarde' | 'noche' | 'libre'

/** Una rutina: lista de pasos en orden (de la mañana, de la noche, un entrenamiento...). */
export interface Rutina extends Registro {
  nombre: string
  categoria: string
  momento: Momento
  /** Días en que toca (0 = lunes). Vacío = cuando quieras. */
  dias: number[]
  pasos: PasoRutina[]
  /** Fechas "AAAA-MM-DD" en que la completaste. */
  registro: string[]
}

export interface Mejora extends Registro {
  texto: string
  creadaEn: number
  hecha: boolean
}

/** Un día de progreso. `id` = la fecha. */
export interface ProgresoDia extends Registro {
  fecha: string
  hechas: number
  enfoque: number
  descanso: number
  pomodoros: number
}

/** "Tus 3 de hoy" elegidas a mano para una fecha. `id` = la fecha. */
export interface PlanDia extends Registro {
  fecha: string
  tareaIds: string[]
}

/** Algo que Astia te recuerda a una hora exacta ("en 10 minutos comprar pan"). */
export interface Recordatorio extends Registro {
  texto: string
  /** Momento exacto en que te avisa (ISO). */
  cuando: string
  /** Ya te avisó. */
  avisado?: boolean
  /** Id del evento que creó en Google Calendar (para borrarlo cuando pase). */
  calendarioId?: string
}

/** Un evento que viene o un apunte de algo que pasó (Mi Órbita y estudios). */
export interface Apunte extends Registro {
  texto: string
  /** "AAAA-MM-DD". */
  fecha: string
  hora?: string
  tipo: 'evento' | 'apunte'
}

export interface Perfil {
  inicioCiclo: string
  semanasCiclo: number
  /** Semanas distintas del ciclo (clave = número de semana): de exámenes o sin clases. */
  semanasEspeciales?: Record<string, 'examenes' | 'libre'>
  enfoqueMin: number
  descansoMin: number
  actualizadoEn: number
}

export interface Datos {
  perfil: Perfil
  cursos: Curso[]
  clases: Clase[]
  tareas: Tarea[]
  semanas: SemanaTema[]
  habitos: Habito[]
  rutinas: Rutina[]
  mejoras: Mejora[]
  progreso: ProgresoDia[]
  planes: PlanDia[]
  recordatorios: Recordatorio[]
  apuntes: Apunte[]
}
