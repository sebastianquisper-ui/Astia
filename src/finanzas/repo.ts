import { CATEGORIA_TRANSFERENCIA, MEDIOS, esFecha, redondear, validarMeta, validarMovimiento, ahorradoEnMeta } from './modelo'
import type { Aporte, Config, Medio, Meta, Movimiento, NuevoMovimiento } from './tipos'

// Lo que Finanstia necesita de la base de datos. Hay dos versiones: Firestore (la real, en la nube) y una local
// en memoria que se guarda en el teléfono (para la vista previa y las pruebas, sin cuenta).

export type Desuscribir = () => void
export type AlError = (err: Error) => void

export interface RepoFinanzas {
  escucharConfig(callback: (config: Config) => void, alError?: AlError): Desuscribir
  /** Rango inclusivo de fechas "AAAA-MM-DD"; el filtro por medio se hace en pantalla. */
  escucharMovimientos(desde: string, hasta: string, callback: (movs: Movimiento[]) => void, alError?: AlError): Desuscribir
  movimientosEntre(desde: string, hasta: string): Promise<Movimiento[]>
  /** Solo para acciones explícitas (todo el historial, la experiencia de Alpi, recalcular saldos): lee todo. */
  todosLosMovimientos(): Promise<Movimiento[]>
  escucharMetas(callback: (metas: Meta[]) => void, alError?: AlError): Desuscribir

  crearMovimiento(mov: NuevoMovimiento): { id: string; listo: Promise<void> }
  actualizarMovimiento(anterior: Movimiento, cambios: Partial<NuevoMovimiento>): Promise<void>
  /** Devuelve lo borrado para poder deshacer con restaurarMovimientos. */
  eliminarMovimiento(mov: Movimiento): Promise<{ borrados: Movimiento[]; listo: Promise<void> }>
  restaurarMovimientos(movs: Movimiento[]): Promise<void>

  crearTransferencia(t: { origen: Medio; destino: Medio; monto: number; fecha: string; nota?: string }): { transferId: string; listo: Promise<void> }
  actualizarTransferencia(transferId: string, cambios: { monto: number; fecha: string; nota: string }): Promise<void>

  guardarCategorias(tipo: 'gasto' | 'ingreso', lista: string[]): Promise<void>
  /** tope vacío o 0 elimina el presupuesto de esa categoría. */
  definirPresupuesto(medio: Medio, categoria: string, tope: number | null): Promise<void>
  recalcularSaldos(): Promise<Record<Medio, number>>

  crearMeta(m: { nombre: string; objetivo: number; limite?: string }): { id: string; listo: Promise<void> }
  actualizarMeta(meta: Meta, cambios: { nombre: string; objetivo: number; limite?: string }): Promise<void>
  eliminarMeta(meta: Meta): Promise<void>
  restaurarMeta(meta: Meta): Promise<void>
  /** monto > 0 aporta, monto < 0 retira (no más de lo ahorrado). */
  aportarAMeta(meta: Meta, monto: number, fecha: string): Promise<void>
}

export function errorDeValidacion(mensaje: string): Error {
  return Object.assign(new Error(mensaje), { code: 'app/validacion' })
}

/** Limpia y valida un movimiento antes de guardarlo (lanza si no es válido). */
export function limpiarMovimiento(m: NuevoMovimiento | Movimiento): NuevoMovimiento {
  const limpio: NuevoMovimiento = {
    tipo: m.tipo,
    categoria: (m.categoria ?? '').trim(),
    monto: m.monto,
    fecha: m.fecha,
    nota: (m.nota ?? '').trim(),
    medio: m.medio,
    creado: m.creado ?? Date.now(),
  }
  if (m.transferId) limpio.transferId = m.transferId
  const problema = validarMovimiento(limpio)
  if (problema) throw errorDeValidacion(problema)
  return limpio
}

export function validarTransferencia(origen: Medio, destino: Medio): void {
  if (!MEDIOS.includes(origen) || !MEDIOS.includes(destino) || origen === destino) throw errorDeValidacion('Elige dos medios distintos.')
}

export function datosDeMeta(m: { nombre: string; objetivo: number; limite?: string }) {
  const datos = { nombre: m.nombre.trim(), objetivo: m.objetivo, limite: m.limite ?? '' }
  const problema = validarMeta(datos)
  if (problema) throw errorDeValidacion(problema)
  return datos
}

export function validarAporte(meta: Pick<Meta, 'aportes'>, monto: number, fecha: string): number {
  const m = redondear(monto)
  if (!Number.isFinite(m) || m === 0) throw errorDeValidacion('Ingresa un monto distinto de 0.')
  if (m < 0 && -m > ahorradoEnMeta(meta)) throw errorDeValidacion('No puedes retirar más de lo ahorrado.')
  if (!esFecha(fecha)) throw errorDeValidacion('Fecha inválida.')
  return m
}

export type { Aporte }
export { CATEGORIA_TRANSFERENCIA }
