import { describe, expect, it } from 'vitest'
import type { Datos, Tarea } from '../../dominio/tipos'
import { datosDeEjemplo } from '../../demo/datosEjemplo'
import { datosVacios } from '../almacenamiento'
import { aDocumento, cambiosPendientes, CAMPOS, clave, COLECCIONES, reemplazarDatos } from './registros'

const tarea = (id: string, extra: Partial<Tarea> = {}): Tarea => ({ id, titulo: 'T', area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-10-20', prioridad: 'media', pideEvidencia: true, pasos: [], estado: 'pendiente', actualizadoEn: 100, ...extra })

describe('registros para la nube', () => {
  it('no manda campos indefinidos ni los que las reglas no conocen', () => {
    const doc = aDocumento('tareas', { ...tarea('a'), hora: undefined, sobrante: 'x', evidencia: { foto: true, enlace: undefined, fecha: 'f' } } as never)
    expect('hora' in doc).toBe(false)
    expect('sobrante' in doc).toBe(false)
    expect(doc.evidencia).toEqual({ foto: true, fecha: 'f' })
    expect(doc.cursoId).toBeNull() // null sí se permite
  })
  it('todos los campos de los datos de ejemplo están en la lista de campos', () => {
    const d = datosDeEjemplo(new Date(2026, 9, 15))
    for (const col of COLECCIONES) {
      for (const r of d[col] as unknown as Record<string, unknown>[]) {
        for (const k of Object.keys(r)) if (r[k] !== undefined) expect(CAMPOS[col], `${col}.${k}`).toContain(k)
      }
    }
  })
  it('solo marca como pendiente lo que cambió desde lo confirmado', () => {
    const datos: Datos = { ...datosVacios(), tareas: [tarea('a', { actualizadoEn: 100 }), tarea('b', { actualizadoEn: 300 })] }
    const sync = new Map([[clave('tareas', 'a'), 100], [clave('tareas', 'b'), 200], [clave('perfil'), 0]])
    const r = cambiosPendientes(datos, sync)
    expect(r.registros.map((x) => x.registro.id)).toEqual(['b'])
    expect(r.perfil).toBe(false)
  })
  it('lo que no se ha subido nunca está pendiente, y un perfil nuevo también', () => {
    const datos: Datos = { ...datosVacios(), tareas: [tarea('a')], perfil: { ...datosVacios().perfil, actualizadoEn: 50 } }
    const r = cambiosPendientes(datos, new Map())
    expect(r.registros).toHaveLength(1)
    expect(r.perfil).toBe(true)
  })
  it('importar un respaldo reemplaza: lo nuevo gana y lo que no viene queda borrado', () => {
    const actual: Datos = { ...datosVacios(), tareas: [tarea('vieja', { actualizadoEn: 10 }), tarea('comun', { actualizadoEn: 10 })] }
    const nuevo: Datos = { ...datosVacios(), tareas: [tarea('comun', { actualizadoEn: 5, titulo: 'Del respaldo' }), tarea('otra', { actualizadoEn: 5 })] }
    const r = reemplazarDatos(actual, nuevo, 1000)
    const por = (id: string) => r.tareas.find((t) => t.id === id)!
    expect(por('comun')).toMatchObject({ titulo: 'Del respaldo', actualizadoEn: 1000 })
    expect(por('comun').borradoEn).toBeUndefined()
    expect(por('otra').actualizadoEn).toBe(1000)
    expect(por('vieja')).toMatchObject({ borradoEn: 1000, actualizadoEn: 1000 })
  })
})
