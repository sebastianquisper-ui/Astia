// Tipos de Finanstia. Los datos tienen la misma forma que en la app "Mis Finanzas" (Firestore):
//   users/{uid}/config/main        categoriasGasto, categoriasIngreso, presupuestos, saldosCent
//   users/{uid}/movimientos/{id}   tipo, categoria, monto, fecha, nota, medio, transferId?, creado
//   users/{uid}/metas/{id}         nombre, objetivo, limite, aportes[], creado

export type TipoMov = 'gasto' | 'ingreso'
export type Medio = 'digital' | 'efectivo'

export interface Movimiento {
  id: string
  tipo: TipoMov
  categoria: string
  /** Soles, mayor que 0. */
  monto: number
  /** "AAAA-MM-DD" en hora local. */
  fecha: string
  nota?: string
  medio: Medio
  /** Las dos patas de una transferencia comparten este id. */
  transferId?: string
  creado?: number
}

/** Un movimiento todavía sin guardar (aún no tiene id). */
export type NuevoMovimiento = Omit<Movimiento, 'id'>

export interface Aporte {
  id: string
  /** Soles; negativo = retiro. */
  monto: number
  fecha: string
}

export interface Meta {
  id: string
  nombre: string
  objetivo: number
  /** "AAAA-MM-DD" o vacío. */
  limite?: string
  aportes: Aporte[]
  creado?: number
}

export type Topes = Record<string, number>

export interface Config {
  categoriasGasto: string[]
  categoriasIngreso: string[]
  presupuestos: Record<Medio, Topes>
  /** Saldo de cada billetera en céntimos enteros. */
  saldosCent: Record<Medio, number>
}

export type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'anio'
export interface Periodo {
  tipo: TipoPeriodo
  ref: string
}
