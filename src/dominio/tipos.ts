// Tipos del dominio de Astia. En la fase 2 estos mismos tipos serán las tablas de la base de datos.

export type Area = 'universidad' | 'personal'
export type TipoTarea = 'tarea' | 'estudio' | 'examen'

export interface Curso {
  id: string
  nombre: string
  color: string
}

/** Un bloque de clase semanal. `dia`: 0 = lunes ... 6 = domingo. Horas en formato "HH:MM". */
export interface Clase {
  id: string
  cursoId: string
  dia: number
  inicio: string
  fin: string
  aula: string
}

export interface Tarea {
  id: string
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
  estado: 'pendiente' | 'hecha'
  /** Momento en que se marcó hecha (ISO). */
  hechaEn?: string
}
