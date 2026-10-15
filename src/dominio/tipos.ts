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
}

/** Tema y notas de una semana del ciclo para un curso. */
export interface SemanaTema extends Registro {
  cursoId: string
  semana: number
  tema: string
  notas: string
}

export interface Meta extends Registro {
  nombre: string
  /** Fechas "AAAA-MM-DD" en que la cumpliste. */
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

export interface Perfil {
  inicioCiclo: string
  semanasCiclo: number
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
  metas: Meta[]
  mejoras: Mejora[]
  progreso: ProgresoDia[]
  planes: PlanDia[]
}
