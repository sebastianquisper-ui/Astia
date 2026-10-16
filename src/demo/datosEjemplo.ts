import type { Clase, Curso, Datos, Habito, Rutina, Tarea } from '../dominio/tipos'
import { datosVacios } from '../datos/almacenamiento'
import { addDays, ymd } from '../lib/fechas'

// DATOS DE EJEMPLO para ver cómo se ve la app. No son los datos reales de nadie.
// Las fechas son relativas a hoy, así siempre hay tareas vencidas, de hoy, de esta semana...

export const CURSOS_EJEMPLO: Curso[] = [
  { id: 'c-calc', nombre: 'Cálculo II', color: '#7C8CFF', actualizadoEn: 0 },
  { id: 'c-disc', nombre: 'Matemática Discreta', color: '#FF7A90', actualizadoEn: 0 },
  { id: 'c-fis', nombre: 'Física', color: '#4FD1A5', actualizadoEn: 0 },
  { id: 'c-prog', nombre: 'Programación', color: '#FFB454', actualizadoEn: 0 },
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
  actualizadoEn: 0,
}))

type Base = Omit<Tarea, 'prioridad' | 'pideEvidencia' | 'pasos' | 'actualizadoEn'>

export function tareasEjemplo(ahora: Date): Tarea[] {
  const en = (dias: number) => ymd(addDays(ahora, dias))
  const lista: Base[] = [
    { id: 't1', titulo: 'Informe de laboratorio', area: 'universidad', cursoId: 'c-fis', tipo: 'tarea', fecha: en(-1), hora: '18:00', estado: 'pendiente' },
    { id: 't2', titulo: 'Examen parcial de Física', area: 'universidad', cursoId: 'c-fis', tipo: 'examen', fecha: en(1), hora: '15:00', estado: 'pendiente' },
    { id: 't3', titulo: 'Resolver práctica de Cálculo II', area: 'universidad', cursoId: 'c-calc', tipo: 'estudio', fecha: en(0), hora: '21:00', estado: 'pendiente' },
    { id: 't4', titulo: 'Leer teoría de grafos', area: 'universidad', cursoId: 'c-disc', tipo: 'estudio', fecha: en(2), estado: 'pendiente' },
    { id: 't5', titulo: 'Pagar el recibo de luz', area: 'personal', cursoId: null, categoria: 'Trámites', tipo: 'tarea', fecha: en(1), hora: '17:00', estado: 'pendiente' },
    { id: 't6', titulo: 'Llamar a mi abuela', area: 'personal', cursoId: null, categoria: 'Familia', tipo: 'tarea', fecha: en(0), hora: '20:00', estado: 'pendiente' },
    { id: 't10', titulo: 'Sacar cita en el dentista', area: 'personal', cursoId: null, categoria: 'Salud', tipo: 'tarea', fecha: en(3), estado: 'pendiente' },
    { id: 't11', titulo: 'Comprar zapatillas para correr', area: 'personal', cursoId: null, categoria: 'Deporte', tipo: 'tarea', fecha: en(6), estado: 'pendiente' },
    { id: 't7', titulo: 'Proyecto de Programación', area: 'universidad', cursoId: 'c-prog', tipo: 'tarea', fecha: en(5), estado: 'pendiente' },
    { id: 't8', titulo: 'Ensayo de Física', area: 'universidad', cursoId: 'c-fis', tipo: 'tarea', fecha: en(12), estado: 'pendiente' },
    { id: 't9', titulo: 'Guía de Matemática Discreta', area: 'universidad', cursoId: 'c-disc', tipo: 'tarea', fecha: en(-2), estado: 'hecha', hechaEn: addDays(ahora, -2).toISOString() },
  ]
  return lista.map((t) => ({ ...t, prioridad: 'media' as const, pideEvidencia: t.tipo === 'estudio', pasos: [], actualizadoEn: 0 }))
}

/** El conjunto completo de datos de ejemplo, listo para usar como `Datos`. */
export function datosDeEjemplo(ahora: Date): Datos {
  return { ...datosVacios(), cursos: CURSOS_EJEMPLO, clases: CLASES_EJEMPLO, tareas: tareasEjemplo(ahora), habitos: habitosEjemplo(ahora), rutinas: rutinasEjemplo() }
}

/** Fechas (AAAA-MM-DD) a partir de cuántos días atrás: [1, 2, 3] = ayer, antier, hace 3 días. */
const atras = (ahora: Date, dias: number[]) => dias.map((n) => ymd(addDays(ahora, -n))).sort()

export function habitosEjemplo(ahora: Date): Habito[] {
  const base = { actualizadoEn: 0 }
  return [
    { ...base, id: 'h-ingles', nombre: '30 minutos de inglés', categoria: 'Mente', color: '#B18CFF', frecuencia: { tipo: 'diaria' }, minimo: 'Solo 5 minutos de una lección', registro: atras(ahora, [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14]) },
    { ...base, id: 'h-correr', nombre: 'Correr 20 minutos', categoria: 'Deporte', color: '#FF9E6E', frecuencia: { tipo: 'dias', dias: [0, 2, 4] }, minimo: 'Solo 5 minutos trotando', registro: atras(ahora, [2, 4, 7, 9]) },
    { ...base, id: 'h-agua', nombre: 'Tomar 2 litros de agua', categoria: 'Salud', color: '#4FD1A5', frecuencia: { tipo: 'diaria' }, minimo: 'Un vaso ahora mismo', registro: atras(ahora, [1, 2, 4, 5]) },
    { ...base, id: 'h-leer', nombre: 'Leer 10 páginas', categoria: 'Mente', color: '#4FC3F7', frecuencia: { tipo: 'semanal', veces: 4 }, minimo: 'Una sola página', registro: atras(ahora, [1, 3, 8, 10, 11, 12]) },
    { ...base, id: 'h-cuarto', nombre: 'Ordenar mi cuarto', categoria: 'Hogar', color: '#FFB454', frecuencia: { tipo: 'semanal', veces: 2 }, minimo: 'Tender la cama', registro: atras(ahora, [9]) },
  ]
}

export function rutinasEjemplo(): Rutina[] {
  const base = { actualizadoEn: 0, registro: [] as string[] }
  return [
    {
      ...base, id: 'r-manana', nombre: 'Rutina de la mañana', categoria: 'Salud', momento: 'manana', dias: [],
      pasos: [{ texto: 'Tender la cama', detalle: '2 min' }, { texto: 'Tomar un vaso de agua' }, { texto: 'Estirar', detalle: '5 min' }, { texto: 'Ducha', detalle: '10 min' }, { texto: 'Revisar el plan del día en Astia' }],
    },
    {
      ...base, id: 'r-pecho', nombre: 'Entrenamiento de pecho y tríceps', categoria: 'Deporte', momento: 'tarde', dias: [0, 3],
      pasos: [{ texto: 'Calentamiento en cinta', detalle: '5 min' }, { texto: 'Press banca', detalle: '4 × 10' }, { texto: 'Aperturas con mancuernas', detalle: '3 × 12' }, { texto: 'Fondos', detalle: '3 × 8' }, { texto: 'Flexiones', detalle: '2 × 15' }, { texto: 'Estiramiento final', detalle: '5 min' }],
    },
    {
      ...base, id: 'r-noche', nombre: 'Rutina de la noche', categoria: 'Mente', momento: 'noche', dias: [],
      pasos: [{ texto: 'Dejar listo el plan de mañana' }, { texto: 'Preparar la mochila' }, { texto: 'Pantallas fuera', detalle: '30 min antes de dormir' }, { texto: 'Leer', detalle: '10 min' }],
    },
  ]
}
