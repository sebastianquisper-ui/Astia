import { describe, expect, it } from 'vitest'
import { guardarRecurrente, horasValidas, icsRecurrente, leerRecurrentes, recurrentesQueTocan, reglaRepeticion, type ItemRecurrente } from './avisosRecurrentes'

const AHORA = new Date(2026, 10, 13, 20, 10)
const item = (pendienteHoy = true): ItemRecurrente => ({ id: 'h-1', titulo: 'Leer', pendienteHoy, etiqueta: 'Hábito', sub: '', destino: '#/habitos', modo: 'personal' })

describe('avisos que se repiten', () => {
  it('limpia horas', () => expect(horasValidas(['21:00', '7:00', '09:30', '21:00'])).toEqual(['09:30', '21:00']))
  it('avisa a la hora si aún falta cumplirlo', () => {
    const r = recurrentesQueTocan([item()], { 'h-1': { horas: ['20:00', '07:00', '22:00'] } }, AHORA, new Set())
    expect(r.map((x) => x.hora)).toEqual(['20:00'])
  })
  it('no avisa si ya lo cumpliste hoy ni repite', () => {
    expect(recurrentesQueTocan([item(false)], { 'h-1': { horas: ['20:00'] } }, AHORA, new Set())).toEqual([])
    expect(recurrentesQueTocan([item()], { 'h-1': { horas: ['20:00'] } }, AHORA, new Set(['h-1 2026-11-13 20:00']))).toEqual([])
  })
  it('regla de repetición por días', () => {
    expect(reglaRepeticion([0, 2, 4])).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(reglaRepeticion(null)).toBe('FREQ=DAILY')
    expect(reglaRepeticion([0, 1, 2, 3, 4, 5, 6])).toBe('FREQ=DAILY')
  })
  it('.ics con un evento por hora', () => {
    const ics = icsRecurrente('h-1', 'Leer', ['08:00', '21:00'], [0, 2], AHORA)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')
  })
  it('guarda y borra la configuración', () => {
    guardarRecurrente('x', { horas: ['08:00'] })
    expect(leerRecurrentes().x.horas).toEqual(['08:00'])
    guardarRecurrente('x', { horas: [] })
    expect(leerRecurrentes().x).toBeUndefined()
  })
})
