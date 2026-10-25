import { CATEGORIA_TRANSFERENCIA, efectoCentimos, normalizarConfig } from './modelo'
import { datosDeMeta, errorDeValidacion, limpiarMovimiento, validarAporte, validarTransferencia, type Desuscribir, type RepoFinanzas } from './repo'
import type { Aporte, Config, Medio, Meta, Movimiento } from './tipos'

// La base de datos de Finanstia en el teléfono: misma forma que Firestore, sin cuenta. Se usa en la vista previa y en
// las pruebas. Guarda en localStorage (si se puede) y avisa a quien esté escuchando cada vez que algo cambia.

interface Estado {
  config: Config
  movimientos: Record<string, Movimiento>
  metas: Record<string, Meta>
}

const CLAVE = 'astia.finanzas.local'
let contador = 0
const nuevoId = (): string => `${Date.now().toString(36)}${(contador++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

function cargar(guardar: boolean): Estado {
  if (guardar) {
    try {
      const crudo = localStorage.getItem(CLAVE)
      if (crudo) {
        const e = JSON.parse(crudo) as Partial<Estado>
        return { config: normalizarConfig(e.config), movimientos: e.movimientos ?? {}, metas: e.metas ?? {} }
      }
    } catch {
      /* guardado dañado o sin almacenamiento: se empieza de cero */
    }
  }
  return { config: normalizarConfig(), movimientos: {}, metas: {} }
}

export function crearRepoLocal({ guardar = true }: { guardar?: boolean } = {}): RepoFinanzas {
  const e = cargar(guardar)
  const oyentes = new Set<() => void>()
  const avisar = () => {
    if (guardar) {
      try {
        localStorage.setItem(CLAVE, JSON.stringify(e))
      } catch {
        /* sin almacenamiento */
      }
    }
    oyentes.forEach((f) => f())
  }
  const escuchar = (f: () => void): Desuscribir => {
    oyentes.add(f)
    queueMicrotask(f)
    return () => oyentes.delete(f)
  }
  const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
  const enRango = (desde: string, hasta: string) => Object.values(e.movimientos).filter((m) => m.fecha >= desde && m.fecha <= hasta)
  const ajustarSaldos = (efectos: [Medio, number][]) => {
    for (const [medio, delta] of efectos) e.config.saldosCent[medio] = (e.config.saldosCent[medio] ?? 0) + delta
  }
  const patas = (transferId: string) => Object.values(e.movimientos).filter((m) => m.transferId === transferId)
  const hecho = Promise.resolve()

  return {
    escucharConfig(callback) {
      return escuchar(() => callback(copia(e.config)))
    },
    escucharMovimientos(desde, hasta, callback) {
      return escuchar(() => callback(copia(enRango(desde, hasta)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))))
    },
    async movimientosEntre(desde, hasta) {
      return copia(enRango(desde, hasta))
    },
    async todosLosMovimientos() {
      return copia(Object.values(e.movimientos))
    },
    escucharMetas(callback) {
      return escuchar(() => callback(copia(Object.values(e.metas))))
    },

    crearMovimiento(mov) {
      const datos = limpiarMovimiento(mov)
      const id = nuevoId()
      e.movimientos[id] = { id, ...datos }
      ajustarSaldos([[datos.medio, efectoCentimos(datos)]])
      avisar()
      return { id, listo: hecho }
    },
    // Las validaciones lanzan al momento, igual que con Firestore.
    actualizarMovimiento(anterior, cambios) {
      if (anterior.transferId) throw errorDeValidacion('Las transferencias se editan con actualizarTransferencia.')
      const { id: _id, ...resto } = { ...anterior, ...cambios, creado: anterior.creado }
      const datos = limpiarMovimiento(resto)
      e.movimientos[anterior.id] = { id: anterior.id, ...datos }
      ajustarSaldos([[anterior.medio, -efectoCentimos(anterior)], [datos.medio, efectoCentimos(datos)]])
      avisar()
      return hecho
    },
    async eliminarMovimiento(mov) {
      const borrados = mov.transferId ? copia(patas(mov.transferId)) : [copia(mov)]
      for (const m of borrados) delete e.movimientos[m.id]
      ajustarSaldos(borrados.map((m): [Medio, number] => [m.medio, -efectoCentimos(m)]))
      avisar()
      return { borrados, listo: hecho }
    },
    async restaurarMovimientos(movs) {
      for (const m of movs) {
        const { id, ...resto } = m
        e.movimientos[id] = { id, ...limpiarMovimiento(resto) }
      }
      ajustarSaldos(movs.map((m): [Medio, number] => [m.medio, efectoCentimos(m)]))
      avisar()
    },

    crearTransferencia({ origen, destino, monto, fecha, nota = '' }) {
      validarTransferencia(origen, destino)
      const transferId = nuevoId()
      const creado = Date.now()
      const comun = { categoria: CATEGORIA_TRANSFERENCIA, monto, fecha, nota, transferId, creado }
      const salida = limpiarMovimiento({ ...comun, tipo: 'gasto', medio: origen })
      const entrada = limpiarMovimiento({ ...comun, tipo: 'ingreso', medio: destino })
      const a = nuevoId()
      const b = nuevoId()
      e.movimientos[a] = { id: a, ...salida }
      e.movimientos[b] = { id: b, ...entrada }
      ajustarSaldos([[origen, efectoCentimos(salida)], [destino, efectoCentimos(entrada)]])
      avisar()
      return { transferId, listo: hecho }
    },
    async actualizarTransferencia(transferId, { monto, fecha, nota }) {
      const efectos: [Medio, number][] = []
      for (const p of patas(transferId)) {
        const { id, ...resto } = { ...p, monto, fecha, nota }
        const nueva = limpiarMovimiento(resto)
        e.movimientos[p.id] = { id, ...nueva }
        efectos.push([p.medio, -efectoCentimos(p)], [p.medio, efectoCentimos(nueva)])
      }
      ajustarSaldos(efectos)
      avisar()
    },

    async guardarCategorias(tipo, lista) {
      const limpia = [...new Set(lista.map((c) => c.trim()).filter(Boolean))]
      if (tipo === 'ingreso') e.config.categoriasIngreso = limpia
      else e.config.categoriasGasto = limpia
      avisar()
    },
    definirPresupuesto(medio, categoria, tope) {
      if (tope && !(tope > 0)) throw errorDeValidacion('El tope debe ser mayor que 0.')
      if (tope) e.config.presupuestos[medio][categoria] = tope
      else delete e.config.presupuestos[medio][categoria]
      avisar()
      return hecho
    },
    async recalcularSaldos() {
      const saldos: Record<Medio, number> = { digital: 0, efectivo: 0 }
      for (const m of Object.values(e.movimientos)) saldos[m.medio] += efectoCentimos(m)
      e.config.saldosCent = saldos
      avisar()
      return { ...saldos }
    },

    crearMeta(m) {
      const datos = datosDeMeta(m)
      const id = nuevoId()
      e.metas[id] = { id, ...datos, aportes: [], creado: Date.now() }
      avisar()
      return { id, listo: hecho }
    },
    actualizarMeta(meta, cambios) {
      e.metas[meta.id] = { ...e.metas[meta.id], ...datosDeMeta(cambios) }
      avisar()
      return hecho
    },
    async eliminarMeta(meta) {
      delete e.metas[meta.id]
      avisar()
    },
    async restaurarMeta(meta) {
      e.metas[meta.id] = copia(meta)
      avisar()
    },
    aportarAMeta(meta, monto, fecha) {
      const m = validarAporte(meta, monto, fecha)
      const aporte: Aporte = { id: nuevoId(), monto: m, fecha }
      e.metas[meta.id] = { ...e.metas[meta.id], aportes: [...(e.metas[meta.id]?.aportes ?? []), aporte] }
      avisar()
      return hecho
    },
  }
}
