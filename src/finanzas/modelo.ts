// Reglas del dominio de Finanstia, sin dependencias de Firebase.
import type { Config, Medio, Meta, Movimiento, NuevoMovimiento, TipoMov } from './tipos'

export const TIPOS: TipoMov[] = ['gasto', 'ingreso']
export const MEDIOS: Medio[] = ['digital', 'efectivo']
export const CATEGORIA_TRANSFERENCIA = 'Transferencia'
export const CATEGORIAS_GASTO = ['ComerRico', 'Almuerzos', 'Tecnología', 'Pasajes', 'Extras']
export const CATEGORIAS_INGRESO = ['Sueldo', 'Propina', 'Venta', 'Regalo']

export const MAX_MONTO = 999_999_999
export const MAX_CATEGORIA = 60
export const MAX_NOTA = 500
export const MAX_NOMBRE_META = 80

const RE_FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

// No usar toISOString(): en Perú (UTC-5), de noche daría el día siguiente.
export function fechaLocal(d = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function esFecha(texto: unknown): texto is string {
  if (typeof texto !== 'string' || !RE_FECHA.test(texto)) return false
  const [a, m, d] = texto.split('-').map(Number)
  const f = new Date(a, m - 1, d)
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

// Acepta "12,50", "12.5", " 1 200,5 "; devuelve NaN si no es un monto válido.
export function parsearMonto(texto: unknown): number {
  if (typeof texto === 'number') return redondear(texto)
  const limpio = String(texto ?? '').replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(limpio)) return NaN
  return redondear(Number(limpio))
}

export function aCentimos(soles: number): number {
  return Math.round(soles * 100)
}

function esMonto(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= MAX_MONTO
}

function esTexto(v: unknown, max: number, { vacio = true } = {}): v is string {
  return typeof v === 'string' && v.length <= max && (vacio || v.trim().length > 0)
}

export function validarMovimiento(m: Partial<NuevoMovimiento>): string | null {
  if (!TIPOS.includes(m.tipo as TipoMov)) return 'Tipo inválido.'
  if (!MEDIOS.includes(m.medio as Medio)) return 'Medio inválido.'
  if (!esMonto(m.monto)) return 'Ingresa un monto mayor que 0.'
  if (!esFecha(m.fecha)) return 'Fecha inválida.'
  if (!esTexto(m.categoria, MAX_CATEGORIA, { vacio: false })) return 'Elige una categoría.'
  if (m.nota != null && !esTexto(m.nota, MAX_NOTA)) return `La nota admite hasta ${MAX_NOTA} caracteres.`
  return null
}

export function validarMeta(m: { nombre?: unknown; objetivo?: unknown; limite?: unknown }): string | null {
  if (!esTexto(m.nombre, MAX_NOMBRE_META, { vacio: false })) return 'Ponle un nombre a la meta.'
  if (!esMonto(m.objetivo)) return 'El objetivo debe ser mayor que 0.'
  if (m.limite && !esFecha(m.limite)) return 'Fecha límite inválida.'
  return null
}

export const esTransferencia = (m: Pick<Movimiento, 'transferId'>): boolean => Boolean(m.transferId)

// Efecto en el saldo de su billetera, en céntimos.
export function efectoCentimos(m: Pick<Movimiento, 'tipo' | 'monto'>): number {
  const c = aCentimos(m.monto)
  return m.tipo === 'ingreso' ? c : -c
}

export function ahorradoEnMeta(meta: Pick<Meta, 'aportes'>): number {
  return redondear((meta.aportes ?? []).reduce((total, a) => total + a.monto, 0))
}

export function configPorDefecto(): Config {
  return {
    categoriasGasto: [...CATEGORIAS_GASTO],
    categoriasIngreso: [...CATEGORIAS_INGRESO],
    presupuestos: { digital: {}, efectivo: {} },
    saldosCent: { digital: 0, efectivo: 0 },
  }
}

// El documento puede no existir aún o estar incompleto: se completa con los valores por defecto.
export function normalizarConfig(data: Partial<Config> | undefined = {}): Config {
  const base = configPorDefecto()
  return {
    categoriasGasto: data.categoriasGasto ?? base.categoriasGasto,
    categoriasIngreso: data.categoriasIngreso ?? base.categoriasIngreso,
    presupuestos: {
      digital: data.presupuestos?.digital ?? {},
      efectivo: data.presupuestos?.efectivo ?? {},
    },
    saldosCent: {
      digital: data.saldosCent?.digital ?? 0,
      efectivo: data.saldosCent?.efectivo ?? 0,
    },
  }
}
