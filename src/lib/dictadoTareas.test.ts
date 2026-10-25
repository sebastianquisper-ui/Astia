import { describe, expect, it } from 'vitest'
import type { Curso } from '../dominio/tipos'
import { interpretarTarea } from './dictadoTareas'

const c = (id: string, nombre: string): Curso => ({ id, nombre, color: '#fff', actualizadoEn: 0 })
const CURSOS = [c('calc', 'Cálculo II'), c('fis', 'Física'), c('disc', 'Matemática Discreta')]
const HOY = new Date(2026, 9, 15) // jueves 15 de octubre de 2026

describe('dictar una tarea', () => {
  it('examen de un curso con día y hora', () => {
    const r = interpretarTarea('Examen de cálculo el viernes a las 3 de la tarde', CURSOS, HOY)
    expect(r).toMatchObject({ tipo: 'examen', cursoId: 'calc', fecha: '2026-10-16', hora: '15:00' })
    expect(r.titulo).toBe('Examen de cálculo')
  })
  it('mañana y hora en formato numérico', () => {
    expect(interpretarTarea('Informe de física para mañana a las 8:30 pm', CURSOS, HOY)).toMatchObject({ cursoId: 'fis', tipo: 'tarea', fecha: '2026-10-16', hora: '20:30' })
  })
  it('quita las muletillas del principio', () => {
    expect(interpretarTarea('Tengo que entregar el laboratorio de física el 20', CURSOS, HOY)).toMatchObject({ titulo: 'Entregar el laboratorio de física', fecha: '2026-10-20' })
  })
  it('día con mes y estudiar', () => {
    expect(interpretarTarea('estudiar discreta el 3 de noviembre', CURSOS, HOY)).toMatchObject({ tipo: 'estudio', cursoId: 'disc', fecha: '2026-11-03' })
  })
  it('un día de la semana que ya pasó o es hoy va a la semana siguiente', () => {
    expect(interpretarTarea('tarea de cálculo el jueves', CURSOS, HOY).fecha).toBe('2026-10-22')
    expect(interpretarTarea('tarea el lunes', CURSOS, HOY).fecha).toBe('2026-10-19')
  })
  it('en N días, hoy y pasado mañana', () => {
    expect(interpretarTarea('leer capítulo en tres días', CURSOS, HOY).fecha).toBe('2026-10-18')
    expect(interpretarTarea('hacer resumen hoy', CURSOS, HOY).fecha).toBe('2026-10-15')
    expect(interpretarTarea('exposición pasado mañana', CURSOS, HOY).fecha).toBe('2026-10-17')
  })
  it('sin fecha ni curso queda para completar', () => {
    expect(interpretarTarea('comprar calculadora', CURSOS, HOY)).toMatchObject({ titulo: 'Comprar calculadora', cursoId: null, fecha: null, hora: null })
  })
  it('setiembre se entiende como septiembre', () => {
    expect(interpretarTarea('examen de física el 5 de setiembre', CURSOS, HOY).fecha).toBe('2027-09-05')
  })
  it('un número suelto no se toma por fecha', () => {
    expect(interpretarTarea('resolver 20 ejercicios de física', CURSOS, HOY).fecha).toBeNull()
  })
})
