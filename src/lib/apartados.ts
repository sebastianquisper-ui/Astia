import type { NombreIcono } from '../ui/Icono'

// Los apartados de Mi Órbita (la parte personal). Cada hábito, rutina o pendiente personal
// pertenece a uno. Astia sugiere una técnica según el apartado, como hace con los cursos.
// Son métodos conocidos de productividad: sirven de guía, no son ciencia exacta.

export interface Tecnica {
  nombre: string
  porque: string
}

export interface Apartado {
  nombre: string
  color: string
  icono: NombreIcono
  tecnica: Tecnica
}

export const APARTADOS: Apartado[] = [
  { nombre: 'Deporte', color: '#FF9E6E', icono: 'deporte', tecnica: { nombre: 'Entrenamiento por series', porque: 'Deja escritos los ejercicios, las series y los descansos. Sin decidir sobre la marcha no hay excusas.' } },
  { nombre: 'Salud', color: '#4FD1A5', icono: 'salud', tecnica: { nombre: 'Apilar hábitos', porque: 'Pega lo nuevo a algo que ya haces: "después de cepillarme, estiro 5 minutos".' } },
  { nombre: 'Mente', color: '#B18CFF', icono: 'mente', tecnica: { nombre: 'Bloque corto y fijo', porque: '10 a 20 minutos a la misma hora cada día rinden más que una hora cuando te acuerdas.' } },
  { nombre: 'Hogar', color: '#FFB454', icono: 'hogar', tecnica: { nombre: 'Pomodoro de limpieza', porque: '25 minutos de enfoque y 5 de descanso: el desorden se acaba antes de que te aburras.' } },
  { nombre: 'Familia', color: '#FF7A90', icono: 'familia', tecnica: { nombre: 'Intención concreta', porque: '"El domingo a las 7 pm llamo a mi abuela" se cumple más que "tengo que llamarla".' } },
  { nombre: 'Dinero', color: '#F2D24B', icono: 'dinero', tecnica: { nombre: 'Revisión semanal', porque: 'Un rato fijo cada semana para ver gastos y pagos evita sustos a fin de mes.' } },
  { nombre: 'Trámites', color: '#4FC3F7', icono: 'tramites', tecnica: { nombre: 'Comerse el sapo', porque: 'Haz primero lo más pesado: lo que queda se siente liviano.' } },
  { nombre: 'Otro', color: '#A9B2D0', icono: 'orbita', tecnica: { nombre: 'Regla de los 2 minutos', porque: 'Si toma menos de 2 minutos, hazlo ahora y no lo anotes.' } },
]

const ALIAS: Record<string, string> = { casa: 'hogar' }

/** Busca un apartado por nombre (sin importar mayúsculas ni tildes). Si no existe: "Otro". */
export function apartadoDe(nombre?: string | null): Apartado {
  const limpia = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const buscado = ALIAS[limpia(nombre ?? '')] ?? limpia(nombre ?? '')
  return APARTADOS.find((a) => limpia(a.nombre) === buscado) ?? APARTADOS[APARTADOS.length - 1]
}
