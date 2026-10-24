// En qué etapa de estudios estás. Cambia el nombre del periodo y cuántas semanas trae por defecto;
// cada institución organiza su calendario distinto, así que todo se puede ajustar.

export type Etapa = 'colegio' | 'preuniversitario' | 'universidad'

export interface InfoEtapa {
  id: Etapa
  nombre: string
  /** Cómo se llama su periodo por defecto (se puede cambiar). */
  periodo: string
  semanas: number
  ayuda: string
}

export const MIN_SEMANAS = 4
export const MAX_SEMANAS = 52

export const ETAPAS: InfoEtapa[] = [
  { id: 'colegio', nombre: 'Colegio', periodo: 'Bimestre', semanas: 10, ayuda: 'Bimestres o trimestres: tú pones cuántas semanas dura el tuyo.' },
  { id: 'preuniversitario', nombre: 'Preuniversitario', periodo: 'Ciclo', semanas: 12, ayuda: 'Ciclos de academia o preparación: pon las semanas que dure el tuyo.' },
  { id: 'universidad', nombre: 'Universidad', periodo: 'Ciclo', semanas: 16, ayuda: 'Ciclos o semestres, casi siempre de 16 semanas, pero cada universidad decide.' },
]

export const etapaDe = (e?: Etapa): InfoEtapa => ETAPAS.find((x) => x.id === e) ?? ETAPAS[2]

/** Una semana puede ser normal, de exámenes o sin clases (feriados, vacaciones). */
export type TipoSemana = 'examenes' | 'libre'
export const NOMBRE_TIPO_SEMANA: Record<TipoSemana, string> = { examenes: 'Exámenes', libre: 'Sin clases' }
