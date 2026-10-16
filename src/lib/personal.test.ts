import { describe, expect, it } from 'vitest'
import type { Habito, Rutina } from '../dominio/tipos'
import { alternarFecha, frecuenciaDe, normalizarDatos } from '../datos/almacenamiento'
import { apartadoDe, APARTADOS } from './apartados'
import { animoPersonal, frasePersonal, frasesToquePersonal } from './avatar'
import { addDays, ymd } from './fechas'
import { cumplimiento30, cumplimientoDeHoy, mejorRacha, rachaDe, semanaDe, textoFrecuencia, tocaEse, tocaHoy, vecesEnSemana } from './habitos'
import { hechaHoy, momentoDeLaHora, rutinaDeAhora, textoDias, tocaHoyRutina } from './rutinas'

// "Hoy" para todas las pruebas: jueves 15 de octubre de 2026
const HOY = new Date(2026, 9, 15, 10, 0)
const dia = (atras: number) => ymd(addDays(HOY, -atras))

const habito = (extra: Partial<Habito> = {}): Habito => ({
  id: 'h', nombre: 'h', categoria: 'Salud', color: '#fff', frecuencia: { tipo: 'diaria' }, registro: [], actualizadoEn: 1, ...extra,
})

describe('apartados', () => {
  it('encuentra por nombre sin importar tildes ni mayúsculas', () => {
    expect(apartadoDe('trámites').nombre).toBe('Trámites')
    expect(apartadoDe('DEPORTE').nombre).toBe('Deporte')
  })
  it('"Casa" (el nombre viejo) es Hogar, y lo desconocido es Otro', () => {
    expect(apartadoDe('Casa').nombre).toBe('Hogar')
    expect(apartadoDe('algo raro').nombre).toBe('Otro')
    expect(apartadoDe(undefined).nombre).toBe('Otro')
  })
  it('todos tienen técnica sugerida', () => {
    expect(APARTADOS.every((a) => a.tecnica.nombre && a.tecnica.porque)).toBe(true)
  })
})

describe('qué días toca un hábito', () => {
  it('los de días fijos solo tocan esos días (0 = lunes)', () => {
    const h = habito({ frecuencia: { tipo: 'dias', dias: [0, 2, 4] } }) // lun, mié, vie
    expect(tocaEse(h, new Date(2026, 9, 14))).toBe(true) // miércoles
    expect(tocaEse(h, HOY)).toBe(false) // jueves
  })
  it('un semanal deja de tocar cuando ya cumpliste su meta de la semana', () => {
    const h = habito({ frecuencia: { tipo: 'semanal', veces: 2 }, registro: [dia(1), dia(2)] }) // mié y mar
    expect(vecesEnSemana(h, HOY)).toBe(2)
    expect(tocaHoy(h, HOY)).toBe(false)
    const hechoHoy = { ...h, registro: [...h.registro, dia(0)] }
    expect(tocaHoy(hechoHoy, HOY)).toBe(true) // si lo hiciste hoy, sigue en la lista de hoy
  })
  it('textos de frecuencia', () => {
    expect(textoFrecuencia({ tipo: 'diaria' })).toBe('Todos los días')
    expect(textoFrecuencia({ tipo: 'dias', dias: [0, 2, 4] })).toBe('lun, mié, vie')
    expect(textoFrecuencia({ tipo: 'semanal', veces: 3 })).toBe('3 veces por semana')
    expect(textoFrecuencia({ tipo: 'semanal', veces: 1 })).toBe('1 vez por semana')
  })
})

describe('rachas', () => {
  it('diaria: cuenta los días seguidos y hoy sin cumplir aún no la rompe', () => {
    const h = habito({ registro: [dia(3), dia(2), dia(1)] }) // faltó hoy
    expect(rachaDe(h, HOY)).toEqual({ n: 3, unidad: 'días' })
  })
  it('diaria: si hoy también cumpliste, suma uno', () => {
    expect(rachaDe(habito({ registro: [dia(2), dia(1), dia(0)] }), HOY).n).toBe(3)
  })
  it('diaria: un día sin cumplir (que no es hoy) la rompe', () => {
    expect(rachaDe(habito({ registro: [dia(4), dia(3), dia(1), dia(0)] }), HOY).n).toBe(2)
  })
  it('sin registros no hay racha', () => {
    expect(rachaDe(habito(), HOY).n).toBe(0)
  })
  it('por días: los días en que no toca no rompen la racha', () => {
    // Toca lun, mié, vie. Hoy es jueves 15. Cumplió mié 14, lun 12 y vie 9: nunca falló un día que tocaba.
    const h = habito({ frecuencia: { tipo: 'dias', dias: [0, 2, 4] }, registro: ['2026-10-09', '2026-10-12', '2026-10-14'] })
    expect(rachaDe(h, HOY).n).toBe(3)
  })
  it('por días: faltar a un día que tocaba la rompe', () => {
    const h = habito({ frecuencia: { tipo: 'dias', dias: [0, 2, 4] }, registro: ['2026-10-09', '2026-10-14'] }) // faltó lun 12
    expect(rachaDe(h, HOY).n).toBe(1)
  })
  it('semanal: cuenta semanas seguidas que llegaste a tu meta (la actual no rompe)', () => {
    const h = habito({ frecuencia: { tipo: 'semanal', veces: 2 }, registro: ['2026-10-05', '2026-10-07', '2026-09-29', '2026-09-30'] })
    // semana del 5 (lun) cumplida, semana del 28 cumplida, semana actual (12) aún con 0: no rompe
    expect(rachaDe(h, HOY)).toEqual({ n: 2, unidad: 'semanas' })
  })
  it('semanal: una semana sin llegar a la meta la rompe', () => {
    const h = habito({ frecuencia: { tipo: 'semanal', veces: 2 }, registro: ['2026-10-05', '2026-09-29', '2026-09-30'] })
    expect(rachaDe(h, HOY).n).toBe(0) // la semana del 5 solo tiene 1 de 2
  })
  it('mejor racha: la más larga de la historia aunque ya se haya roto', () => {
    const registro = [dia(20), dia(19), dia(18), dia(17), dia(16), dia(2), dia(1)]
    const h = habito({ registro })
    expect(mejorRacha(h, HOY)).toEqual({ n: 5, unidad: 'días' })
    expect(rachaDe(h, HOY).n).toBe(2)
  })
  it('mejor racha sin registros es 0', () => {
    expect(mejorRacha(habito(), HOY).n).toBe(0)
  })
})

describe('semana y cumplimiento', () => {
  it('los puntitos de la semana: hecho, faltó, hoy y futuro', () => {
    const h = habito({ registro: ['2026-10-12', '2026-10-14'] }) // lun y mié
    const estados = semanaDe(h, HOY).map((d) => d.estado)
    expect(estados).toEqual(['hecho', 'falto', 'hecho', 'hoy', 'futuro', 'futuro', 'futuro'])
  })
  it('un hábito por días muestra "libre" en los días que no toca', () => {
    const h = habito({ frecuencia: { tipo: 'dias', dias: [0, 2, 4] }, registro: ['2026-10-12'] })
    expect(semanaDe(h, HOY).map((d) => d.estado)).toEqual(['hecho', 'libre', 'falto', 'hoy', 'futuro', 'futuro', 'futuro'])
  })
  it('cumplimiento de hoy cuenta solo lo que toca', () => {
    const a = habito({ id: 'a', registro: [dia(0)] })
    const b = habito({ id: 'b' })
    const c = habito({ id: 'c', frecuencia: { tipo: 'dias', dias: [0] } }) // solo lunes: hoy no toca
    expect(cumplimientoDeHoy([a, b, c], HOY)).toEqual({ hechos: 1, total: 2 })
  })
  it('cumplimiento de 30 días en porcentaje', () => {
    const h = habito({ registro: Array.from({ length: 15 }, (_, i) => dia(i)) })
    expect(cumplimiento30(h, HOY)).toBe(50)
    expect(cumplimiento30(habito(), HOY)).toBe(0)
  })
  it('alternarFecha agrega y quita sin tocar la lista original', () => {
    const base = ['2026-10-01']
    Object.freeze(base)
    const con = alternarFecha(base, '2026-10-03')
    expect(con).toEqual(['2026-10-01', '2026-10-03'])
    expect(alternarFecha(con, '2026-10-03')).toEqual(['2026-10-01'])
  })
})

describe('rutinas', () => {
  const rutina = (extra: Partial<Rutina> = {}): Rutina => ({ id: 'r', nombre: 'r', categoria: 'Salud', momento: 'manana', dias: [], pasos: [{ texto: 'a' }], registro: [], actualizadoEn: 1, ...extra })
  it('momento según la hora', () => {
    expect(momentoDeLaHora(7)).toBe('manana')
    expect(momentoDeLaHora(15)).toBe('tarde')
    expect(momentoDeLaHora(21)).toBe('noche')
  })
  it('la rutina de ahora es la del momento que toca hoy y no hiciste', () => {
    const manana = rutina({ id: 'm' })
    const noche = rutina({ id: 'n', momento: 'noche' })
    expect(rutinaDeAhora([noche, manana], new Date(2026, 9, 15, 8, 0))?.id).toBe('m')
    expect(rutinaDeAhora([noche, manana], new Date(2026, 9, 15, 21, 0))?.id).toBe('n')
    expect(rutinaDeAhora([{ ...manana, registro: ['2026-10-15'] }], new Date(2026, 9, 15, 8, 0))).toBeUndefined()
  })
  it('respeta los días de la rutina', () => {
    const lunes = rutina({ dias: [0] })
    expect(tocaHoyRutina(lunes, HOY)).toBe(false) // jueves
    expect(tocaHoyRutina(rutina(), HOY)).toBe(true) // sin días fijos
    expect(hechaHoy(rutina({ registro: ['2026-10-15'] }), HOY)).toBe(true)
  })
  it('texto de los días', () => {
    expect(textoDias([])).toBe('Cuando quieras')
    expect(textoDias([0, 2, 4])).toBe('lun, mié, vie')
  })
})

describe('lectura segura de hábitos y rutinas', () => {
  it('frecuencia desconocida o dañada es "todos los días"', () => {
    expect(frecuenciaDe(undefined)).toEqual({ tipo: 'diaria' })
    expect(frecuenciaDe({ tipo: 'dias', dias: [] })).toEqual({ tipo: 'diaria' })
    expect(frecuenciaDe({ tipo: 'dias', dias: [4, 0, 9, 0] })).toEqual({ tipo: 'dias', dias: [0, 4] })
    expect(frecuenciaDe({ tipo: 'semanal', veces: 99 })).toEqual({ tipo: 'semanal', veces: 7 })
  })
  it('los respaldos viejos con "metas" se leen como hábitos', () => {
    const d = normalizarDatos({ metas: [{ id: 'g1', nombre: 'Inglés', registro: ['2026-10-01', 'mal', '2026-10-01'], actualizadoEn: 5 }] })
    expect(d.habitos).toHaveLength(1)
    expect(d.habitos[0]).toMatchObject({ nombre: 'Inglés', categoria: 'Otro', frecuencia: { tipo: 'diaria' }, registro: ['2026-10-01'] })
  })
  it('una rutina sin pasos válidos queda sin pasos y los momentos raros pasan a "libre"', () => {
    const d = normalizarDatos({ rutinas: [{ id: 'r', actualizadoEn: 1, nombre: 'x', momento: 'raro', pasos: [{ texto: '  ' }, { texto: 'Press', detalle: '4 × 10' }, 5] }] })
    expect(d.rutinas[0].momento).toBe('libre')
    expect(d.rutinas[0].pasos).toEqual([{ texto: 'Press', detalle: '4 × 10' }])
  })
})

describe('Astia en modo personal', () => {
  const base = { hora: 15, hayHabitos: true, vencidas: 0, habitosHechos: 1, habitosTotal: 4, rachaMax: 0 }
  it('estricta por defecto, alerta con vencidos, contenta al cumplir todo, dormida de noche', () => {
    expect(animoPersonal(base)).toBe('seria')
    expect(animoPersonal({ ...base, vencidas: 2 })).toBe('alerta')
    expect(animoPersonal({ ...base, habitosHechos: 4 })).toBe('contenta')
    expect(animoPersonal({ ...base, hora: 2 })).toBe('durmiendo')
  })
  it('sin hábitos nunca está "contenta"', () => {
    expect(animoPersonal({ ...base, habitosHechos: 0, habitosTotal: 0 })).toBe('seria')
  })
  it('las frases usan singular y plural y mencionan la racha', () => {
    expect(frasePersonal({ ...base, habitosHechos: 3 }, 'Seba', 0)).toContain('Te falta 1 hábito')
    expect(frasePersonal(base, 'Seba', 0)).toContain('Te faltan 3 hábitos')
    expect(frasePersonal({ ...base, habitosHechos: 4, rachaMax: 7 }, 'Seba', 0)).toContain('Racha de 7 días')
    expect(frasePersonal({ ...base, vencidas: 1 }, 'Seba', 0)).toContain('1 pendiente personal vencido')
  })
  it('si hay una rutina pendiente la menciona', () => {
    expect(frasePersonal({ ...base, rutinaPendiente: 'rutina de la mañana' }, 'Seba', 0)).toContain('rutina de la mañana')
  })
  it('sin hábitos pide crear el primero', () => {
    expect(frasePersonal({ ...base, hayHabitos: false }, 'Seba', 0)).toContain('Crea el primero')
  })
  it('al tocarla tiene varias frases', () => {
    expect(frasesToquePersonal('Seba').length).toBeGreaterThan(4)
  })
})
