import type { Area, PlanDia, Tarea } from '../dominio/tipos'
import { ymd } from './fechas'
import { porUrgencia } from './urgencia'

/**
 * "Tus 3 de hoy". Si elegiste tus 3 a mano para hoy, esas. Si no, las 3 más urgentes.
 * Las que cumpliste hoy siguen en la lista (así no se reordena mientras las marcas).
 * `tareas` debe traer solo tareas activas (no borradas).
 */
export function planDeHoy(tareas: Tarea[], planes: PlanDia[], area: 'todo' | Area, ahora: Date): Tarea[] {
  const hoy = ymd(ahora)
  const delArea = (t: Tarea) => area === 'todo' || t.area === area

  const manual = planes.find((p) => p.fecha === hoy && p.borradoEn === undefined)
  if (manual) {
    return manual.tareaIds
      .map((id) => tareas.find((t) => t.id === id))
      .filter((t): t is Tarea => t !== undefined && delArea(t))
      .slice(0, 3)
  }

  const hechaHoy = (t: Tarea) => t.estado === 'hecha' && t.hechaEn !== undefined && ymd(new Date(t.hechaEn)) === hoy
  return tareas
    .filter((t) => delArea(t) && (t.estado === 'pendiente' || hechaHoy(t)))
    .sort(porUrgencia)
    .slice(0, 3)
}
