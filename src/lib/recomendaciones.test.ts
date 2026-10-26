import { describe, expect, it } from 'vitest'
import type { Habito, Tarea } from '../dominio/tipos'
import { recomendar, type ContextoRecomendacion } from './recomendaciones'

const AHORA = new Date(2026, 9, 26, 10, 0) // lunes 26 de octubre de 2026, 10:00
const dia = (n: number) => {
  const d = new Date(2026, 9, 26 + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const tarea = (o: Partial<Tarea>): Tarea => ({ id: Math.random().toString(), actualizadoEn: 0, titulo: 'Tarea', area: 'universidad', cursoId: null, tipo: 'tarea', fecha: dia(5), prioridad: 'media', pideEvidencia: false, pasos: [], estado: 'pendiente', ...o })
const habito = (o: Partial<Habito> = {}): Habito => ({ id: 'h', actualizadoEn: 0, nombre: 'Leer', categoria: 'Mente', color: '#fff', frecuencia: { tipo: 'diaria' }, registro: [], ...o })
const base: ContextoRecomendacion = { ahora: AHORA, tareas: [], cursos: [], habitos: [], progreso: [], energia: null, plata: null }
const ids = (c: Partial<ContextoRecomendacion>) => recomendar({ ...base, ...c }).map((r) => r.id)

describe('recomendar', () => {
  it('sin datos no recomienda nada', () => expect(ids({})).toEqual([]))

  it('un examen cercano manda y usa recuperación activa', () => {
    const r = recomendar({ ...base, tareas: [tarea({ tipo: 'examen', titulo: 'Parcial de Cálculo', fecha: dia(2) })] })
    expect(r[0].id).toBe('examen')
    expect(r[0].metodo).toBe('recuperacion')
    expect(r[0].titulo).toContain('en 2 días')
  })
  it('un examen lejano pide repaso espaciado', () => expect(recomendar({ ...base, tareas: [tarea({ tipo: 'examen', fecha: dia(6) })] })[0].metodo).toBe('espaciada'))

  it('de noche y con examen mañana, recomienda dormir primero', () => {
    const noche = new Date(2026, 9, 26, 23, 0)
    expect(recomendar({ ...base, ahora: noche, tareas: [tarea({ tipo: 'examen', fecha: dia(1) })] })[0].id).toBe('dormir')
  })

  it('lo vencido va primero y, con poca energía, en bloque corto', () => {
    const r = recomendar({ ...base, energia: 'baja', tareas: [tarea({ titulo: 'Informe', fecha: dia(-2) })] })
    expect(r[0]).toMatchObject({ id: 'vencida', metodo: 'pomodoro' })
  })

  it('el ánimo cambia la recomendación', () => {
    const tareas = [tarea({ titulo: 'Ensayo', prioridad: 'alta' }), tarea({ titulo: 'Lectura', prioridad: 'baja' })]
    expect(recomendar({ ...base, tareas, energia: 'baja' })[0].detalle).toContain('Lectura')
    expect(recomendar({ ...base, tareas, energia: 'alta' })[0].detalle).toContain('Ensayo')
  })

  it('cuida la racha de un hábito', () => {
    const registro = [dia(-1), dia(-2), dia(-3)]
    expect(ids({ habitos: [habito({ registro })] })).toContain('racha')
  })
  it('en semana pesada pide bajar los hábitos a su mínimo', () => {
    const tareas = [tarea({ tipo: 'examen', fecha: dia(3) })]
    expect(ids({ tareas, habitos: [habito()] })).toContain('habitos-pesada')
  })

  describe('la plata', () => {
    it('no aparece si el usuario no la comparte', () => expect(ids({ plata: null, tareas: [tarea({})] })).not.toContain('plata'))
    it('en rojo y con la semana cargada, cruza estudio y plata', () => {
      expect(ids({ plata: 'rojo', tareas: [tarea({ tipo: 'examen', fecha: dia(3) })] })).toContain('plata-carga')
    })
    it('en verde no molesta', () => expect(ids({ plata: 'verde', tareas: [tarea({})] })).not.toContain('plata'))
  })

  describe('el sueño', () => {
    const examen = [tarea({ tipo: 'examen', fecha: dia(1) })]
    it('dormir poco con examen cerca manda sobre todo', () => {
      const r = recomendar({ ...base, tareas: examen, sueno: { horasUltimaNoche: 4, promedio7: null } })
      expect(r[0].id).toBe('sueno-examen')
    })
    it('dormir poco sin examen baja el ritmo', () => expect(ids({ tareas: [tarea({})], sueno: { horasUltimaNoche: 5, promedio7: null } })).toContain('sueno-poco'))
    it('un promedio bajo con examen esta semana avisa que se cae', () => {
      expect(ids({ tareas: [tarea({ tipo: 'examen', fecha: dia(5) })], sueno: { horasUltimaNoche: 7, promedio7: 5.5 } })).toContain('sueno-cae')
    })
    it('dormir bien no cambia nada', () => expect(ids({ tareas: examen, sueno: { horasUltimaNoche: 8, promedio7: 7.5 } })).not.toContain('sueno-examen'))
  })

  it('nunca devuelve más de 3 y va de mayor a menor prioridad', () => {
    const r = recomendar({ ...base, energia: 'baja', plata: 'rojo', habitos: [habito({ registro: [dia(-1), dia(-2), dia(-3)] })], tareas: [tarea({ tipo: 'examen', fecha: dia(1) }), tarea({ fecha: dia(-1) })] })
    expect(r).toHaveLength(3)
    expect(r.map((x) => x.prioridad)).toEqual([...r.map((x) => x.prioridad)].sort((a, b) => b - a))
  })
})
