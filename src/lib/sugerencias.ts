import type { Frecuencia, Momento, PasoRutina } from '../dominio/tipos'

// Ideas para empezar rápido: se muestran cuando todavía no hay hábitos ni rutinas.

export interface SugerenciaHabito {
  nombre: string
  categoria: string
  minimo: string
  frecuencia: Frecuencia
}

export const SUGERENCIAS_HABITOS: SugerenciaHabito[] = [
  { nombre: 'Tomar 2 litros de agua', categoria: 'Salud', minimo: 'Un vaso ahora mismo', frecuencia: { tipo: 'diaria' } },
  { nombre: 'Ejercicio 20 minutos', categoria: 'Deporte', minimo: 'Solo 5 minutos', frecuencia: { tipo: 'dias', dias: [0, 2, 4] } },
  { nombre: 'Leer 10 páginas', categoria: 'Mente', minimo: 'Una sola página', frecuencia: { tipo: 'diaria' } },
  { nombre: 'Dormir antes de las 11', categoria: 'Salud', minimo: 'Pantallas fuera a las 10:30', frecuencia: { tipo: 'diaria' } },
  { nombre: 'Ordenar mi cuarto', categoria: 'Hogar', minimo: 'Tender la cama', frecuencia: { tipo: 'semanal', veces: 2 } },
]

export interface PlantillaRutina {
  nombre: string
  categoria: string
  momento: Momento
  pasos: PasoRutina[]
}

export const PLANTILLAS_RUTINA: PlantillaRutina[] = [
  { nombre: 'Rutina de la mañana', categoria: 'Salud', momento: 'manana', pasos: [{ texto: 'Tender la cama', detalle: '2 min' }, { texto: 'Tomar un vaso de agua' }, { texto: 'Estirar', detalle: '5 min' }, { texto: 'Revisar el plan del día en Astia' }] },
  { nombre: 'Entrenamiento de cuerpo completo', categoria: 'Deporte', momento: 'tarde', pasos: [{ texto: 'Calentamiento', detalle: '5 min' }, { texto: 'Sentadillas', detalle: '4 × 12' }, { texto: 'Flexiones', detalle: '3 × 10' }, { texto: 'Remo con mancuerna', detalle: '3 × 12' }, { texto: 'Plancha', detalle: '3 × 30 s' }, { texto: 'Estiramiento final', detalle: '5 min' }] },
  { nombre: 'Rutina de la noche', categoria: 'Mente', momento: 'noche', pasos: [{ texto: 'Dejar listo el plan de mañana' }, { texto: 'Preparar la mochila' }, { texto: 'Pantallas fuera', detalle: '30 min antes de dormir' }, { texto: 'Leer', detalle: '10 min' }] },
]
