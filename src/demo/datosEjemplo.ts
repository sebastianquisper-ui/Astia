import type { Clase, Curso, Tarea } from '../dominio/tipos'
import { addDays, ymd } from '../lib/fechas'

// DATOS DE EJEMPLO para ver cómo se ve la app. No son los datos reales de nadie.
// Las fechas son relativas a hoy, así siempre hay tareas vencidas, de hoy, de esta semana...

export const CURSOS_EJEMPLO: Curso[] = [
  { id: 'c-calc', nombre: 'Cálculo II', color: '#7C8CFF' },
  { id: 'c-disc', nombre: 'Matemática Discreta', color: '#FF7A90' },
  { id: 'c-fis', nombre: 'Física', color: '#4FD1A5' },
  { id: 'c-prog', nombre: 'Programación', color: '#FFB454' },
]

// [día (0 = lunes), curso, inicio, fin, aula]
const HORARIO: [number, string, string, string, string][] = [
  [0, 'c-calc', '08:00', '10:00', 'A-203'],
  [0, 'c-disc', '10:00', '12:00', 'B-101'],
  [0, 'c-prog', '14:00', '16:00', 'Lab 3'],
  [1, 'c-fis', '08:00', '10:00', 'C-305'],
  [1, 'c-calc', '10:00', '12:00', 'A-203'],
  [1, 'c-disc', '14:00', '16:00', 'B-101'],
  [2, 'c-prog', '08:00', '10:00', 'Lab 3'],
  [2, 'c-fis', '10:00', '12:00', 'C-305'],
  [2, 'c-calc', '16:00', '18:00', 'A-203'],
  [3, 'c-disc', '08:00', '10:00', 'B-101'],
  [3, 'c-calc', '10:00', '12:00', 'A-203'],
  [3, 'c-fis', '14:00', '16:00', 'C-305'],
  [4, 'c-prog', '10:00', '12:00', 'Lab 3'],
  [4, 'c-disc', '14:00', '16:00', 'B-101'],
]

export const CLASES_EJEMPLO: Clase[] = HORARIO.map(([dia, cursoId, inicio, fin, aula], i) => ({
  id: 'cl-' + i,
  cursoId,
  dia,
  inicio,
  fin,
  aula,
}))

export function tareasEjemplo(ahora: Date): Tarea[] {
  const en = (dias: number) => ymd(addDays(ahora, dias))
  return [
    { id: 't1', titulo: 'Informe de laboratorio', area: 'universidad', cursoId: 'c-fis', tipo: 'tarea', fecha: en(-1), hora: '18:00', estado: 'pendiente' },
    { id: 't2', titulo: 'Examen parcial de Física', area: 'universidad', cursoId: 'c-fis', tipo: 'examen', fecha: en(1), hora: '15:00', estado: 'pendiente' },
    { id: 't3', titulo: 'Resolver práctica de Cálculo II', area: 'universidad', cursoId: 'c-calc', tipo: 'estudio', fecha: en(0), hora: '21:00', estado: 'pendiente' },
    { id: 't4', titulo: 'Leer teoría de grafos', area: 'universidad', cursoId: 'c-disc', tipo: 'estudio', fecha: en(2), estado: 'pendiente' },
    { id: 't5', titulo: 'Pagar el recibo de luz', area: 'personal', cursoId: null, categoria: 'Trámites', tipo: 'tarea', fecha: en(1), hora: '17:00', estado: 'pendiente' },
    { id: 't6', titulo: 'Llamar a mi abuela', area: 'personal', cursoId: null, categoria: 'Familia', tipo: 'tarea', fecha: en(0), hora: '20:00', estado: 'pendiente' },
    { id: 't7', titulo: 'Proyecto de Programación', area: 'universidad', cursoId: 'c-prog', tipo: 'tarea', fecha: en(5), estado: 'pendiente' },
    { id: 't8', titulo: 'Ensayo de Física', area: 'universidad', cursoId: 'c-fis', tipo: 'tarea', fecha: en(12), estado: 'pendiente' },
    { id: 't9', titulo: 'Guía de Matemática Discreta', area: 'universidad', cursoId: 'c-disc', tipo: 'tarea', fecha: en(-2), estado: 'hecha', hechaEn: addDays(ahora, -2).toISOString() },
  ]
}
