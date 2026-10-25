import { describe, expect, it } from 'vitest'
import { cuandoTexto, fraseDeAviso, interpretarRecordatorio } from './recordatorios'

const AHORA = new Date(2026, 9, 15, 10, 30, 0) // jueves 10:30
const hhmm = (d: Date | null) => (d ? `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null)

describe('recordatorios dictados', () => {
  it('en N minutos', () => {
    const r = interpretarRecordatorio('en 10 minutos comprar pan', AHORA)
    expect(r.texto).toBe('Comprar pan')
    expect(hhmm(r.cuando)).toBe('15/10 10:40')
  })
  it('con "recuérdame" y números en palabras', () => {
    const r = interpretarRecordatorio('Recuérdame en diez minutos sacar la basura', AHORA)
    expect(r.texto).toBe('Sacar la basura')
    expect(hhmm(r.cuando)).toBe('15/10 10:40')
  })
  it('media hora, una hora y media, 2 horas', () => {
    expect(hhmm(interpretarRecordatorio('en media hora llamar a mi mamá', AHORA).cuando)).toBe('15/10 11:00')
    expect(hhmm(interpretarRecordatorio('dentro de una hora y media estudiar', AHORA).cuando)).toBe('15/10 12:00')
    expect(hhmm(interpretarRecordatorio('en 2 horas lavar ropa', AHORA).cuando)).toBe('15/10 12:30')
  })
  it('a una hora del día; si ya pasó, es mañana', () => {
    expect(hhmm(interpretarRecordatorio('a las 5 de la tarde ir al banco', AHORA).cuando)).toBe('15/10 17:00')
    expect(hhmm(interpretarRecordatorio('a las 8 de la mañana llevar el informe', AHORA).cuando)).toBe('16/10 08:00')
  })
  it('mañana a las 7 y día de la semana', () => {
    const r = interpretarRecordatorio('mañana a las 7 de la noche recoger el pedido', AHORA)
    expect(r.texto).toBe('Recoger el pedido')
    expect(hhmm(r.cuando)).toBe('16/10 19:00')
    expect(hhmm(interpretarRecordatorio('el viernes a las 9 de la mañana examen', AHORA).cuando)).toBe('16/10 09:00')
  })
  it('sin hora no inventa el momento', () => {
    expect(interpretarRecordatorio('comprar pan', AHORA).cuando).toBeNull()
  })
  it('la frase que dice Alpi', () => {
    expect(fraseDeAviso('Sebastián', 'Comprar pan')).toBe('Sebastián, tienes que comprar pan.')
    expect(fraseDeAviso('Sebastián', 'La reunión con el profe')).toBe('Sebastián, recuerda: la reunión con el profe.')
  })
  it('cuándo en texto corto', () => {
    expect(cuandoTexto(new Date(2026, 9, 15, 10, 40), AHORA)).toBe('en 10 min (10:40)')
    expect(cuandoTexto(new Date(2026, 9, 15, 17, 0), AHORA)).toBe('hoy 17:00')
    expect(cuandoTexto(new Date(2026, 9, 16, 8, 0), AHORA)).toBe('mañana 08:00')
  })
})
