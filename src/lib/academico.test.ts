import { describe, expect, it } from 'vitest'
import type { Clase, ProgresoDia, Tarea } from '../dominio/tipos'
import { cargaDelCiclo, cuadriculaDelMes, rachaDeDias, resumenReciente, semanaAcademica, semanaActualDelCiclo } from './academico'

const tarea = (o: Partial<Tarea>): Tarea => ({ id: 't', actualizadoEn: 0, titulo: 'x', area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-10-15', prioridad: 'media', pideEvidencia: true, pasos: [], estado: 'pendiente', ...o })
const dia = (fecha: string, o: Partial<ProgresoDia> = {}): ProgresoDia => ({ id: fecha, fecha, actualizadoEn: 0, hechas: 1, enfoque: 0, descanso: 0, pomodoros: 0, ...o })

describe('semanaAcademica', () => {
  it('reparte clases por día y tareas por fecha', () => {
    const clases: Clase[] = [
      { id: 'a', actualizadoEn: 0, cursoId: 'c', dia: 3, inicio: '14:00', fin: '16:00', aula: '' },
      { id: 'b', actualizadoEn: 0, cursoId: 'c', dia: 3, inicio: '08:00', fin: '10:00', aula: '' },
    ]
    const sem = semanaAcademica(clases, [tarea({ id: '1', fecha: '2026-10-15', hora: '21:00' }), tarea({ id: '2', fecha: '2026-10-15', hora: '09:00' }), tarea({ id: '3', area: 'personal', fecha: '2026-10-15' })], new Date(2026, 9, 12))
    expect(sem).toHaveLength(7)
    expect(sem[3].clases.map((c) => c.id)).toEqual(['b', 'a'])
    expect(sem[3].tareas.map((t) => t.id)).toEqual(['2', '1']) // la personal no entra
    expect(sem[0].tareas).toHaveLength(0)
  })
})

describe('cargaDelCiclo', () => {
  it('cuenta tareas y exámenes por semana', () => {
    const c = cargaDelCiclo([tarea({ fecha: '2026-10-05' }), tarea({ fecha: '2026-10-14', tipo: 'examen' }), tarea({ fecha: '2026-10-15', estado: 'hecha' })], '2026-10-05', 4)
    expect(c.map((s) => s.total)).toEqual([1, 2, 0, 0])
    expect(c[1].examenes).toBe(1)
    expect(c[1].pendientes).toBe(1)
  })
  it('sin inicio no hay ciclo', () => expect(cargaDelCiclo([], '', 16)).toEqual([]))
})

describe('semanaActualDelCiclo', () => {
  it('da la semana dentro del ciclo y null fuera', () => {
    expect(semanaActualDelCiclo('2026-10-05', new Date(2026, 9, 15), 16)).toBe(2)
    expect(semanaActualDelCiclo('2026-10-05', new Date(2026, 9, 1), 16)).toBeNull()
    expect(semanaActualDelCiclo('2026-10-05', new Date(2027, 5, 1), 16)).toBeNull()
    expect(semanaActualDelCiclo('', new Date(), 16)).toBeNull()
  })
})

describe('cuadriculaDelMes', () => {
  it('octubre 2026 empieza en jueves y tiene 5 filas', () => {
    const g = cuadriculaDelMes(2026, 9)
    expect(g).toHaveLength(5)
    expect(g[0].slice(0, 3)).toEqual([null, null, null])
    expect(g[0][3]?.getDate()).toBe(1)
    expect(g.flat().filter(Boolean)).toHaveLength(31)
  })
})

describe('rachaDeDias', () => {
  const hoy = new Date(2026, 9, 15)
  it('cuenta días seguidos hasta hoy', () => {
    expect(rachaDeDias([dia('2026-10-13'), dia('2026-10-14'), dia('2026-10-15')], hoy)).toEqual({ actual: 3, mejor: 3 })
  })
  it('si hoy aún no hiciste nada, la racha sigue desde ayer', () => {
    expect(rachaDeDias([dia('2026-10-13'), dia('2026-10-14')], hoy).actual).toBe(2)
  })
  it('un día sin cumplir la corta, y la mejor se conserva', () => {
    const r = rachaDeDias([dia('2026-10-01'), dia('2026-10-02'), dia('2026-10-03'), dia('2026-10-14')], hoy)
    expect(r).toEqual({ actual: 1, mejor: 3 })
  })
  it('un día sin nada no cuenta', () => {
    expect(rachaDeDias([dia('2026-10-15', { hechas: 0 })], hoy)).toEqual({ actual: 0, mejor: 0 })
  })
  it('el enfoque también cuenta', () => {
    expect(rachaDeDias([dia('2026-10-15', { hechas: 0, enfoque: 25, pomodoros: 1 })], hoy).actual).toBe(1)
  })
})

describe('resumenReciente', () => {
  it('suma solo la ventana pedida', () => {
    const r = resumenReciente([dia('2026-10-15', { hechas: 2, enfoque: 50, pomodoros: 2 }), dia('2026-10-10', { hechas: 4 }), dia('2026-10-01', { hechas: 9 })], new Date(2026, 9, 15), 7)
    expect(r).toEqual({ hechas: 6, enfoque: 50, pomodoros: 2, diasCumplidos: 2 })
  })
})
