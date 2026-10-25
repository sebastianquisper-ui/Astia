import { porcentaje, soles } from './formato'
import type { GrupoTendencia } from './periodos'

// Gráficos en SVG (sin librerías): una dona de gastos por categoría y barras de ingresos contra gastos.

// Paleta de categorías en orden fijo; el color sigue a la categoría, no a su puesto en el ranking.
export const PALETA = ['#e0b348', '#4fa57a', '#9b8bd8', '#e0806a', '#9aa89c', '#6ba6c4', '#b98558', '#8db36a', '#d077ac', '#7f93b4']
const MAX_PORCIONES = 7

export interface Porcion {
  categoria: string | null
  etiqueta: string
  total: number
  color: string
}

// Las categorías sin color propio o más allá del máximo de porciones se agrupan en "Otras".
export function porcionesDona(porCategoria: { categoria: string; total: number }[], categoriasGasto: string[]): Porcion[] {
  const porciones: Porcion[] = []
  let otras = 0
  for (const { categoria, total } of porCategoria) {
    const i = categoriasGasto.indexOf(categoria)
    if (i >= 0 && i < PALETA.length && porciones.length < MAX_PORCIONES - 1) porciones.push({ categoria, etiqueta: categoria, total, color: PALETA[i] })
    else otras += total
  }
  if (otras > 0) porciones.push({ categoria: null, etiqueta: 'Otras', total: Math.round(otras * 100) / 100, color: '#7c8a82' })
  return porciones
}

export function Dona({ porciones, centro }: { porciones: Porcion[]; centro: React.ReactNode }) {
  const total = porciones.reduce((s, p) => s + p.total, 0)
  const R = 42
  const C = 2 * Math.PI * R
  let acumulado = 0
  return (
    <div className="fz-dona">
      <svg viewBox="0 0 100 100" role="img" aria-label="Gráfico de gastos por categoría; el detalle está en la lista.">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface2)" strokeWidth="12" />
        {porciones.map((p) => {
          const largo = (p.total / total) * C
          const el = (
            <circle key={p.etiqueta} cx="50" cy="50" r={R} fill="none" stroke={p.color} strokeWidth="12" strokeDasharray={`${Math.max(0, largo - 0.8)} ${C}`} strokeDashoffset={-acumulado} transform="rotate(-90 50 50)">
              <title>{`${p.etiqueta}: ${soles(p.total)} · ${porcentaje(p.total, total)}`}</title>
            </circle>
          )
          acumulado += largo
          return el
        })}
      </svg>
      <div className="fz-dona-centro">{centro}</div>
    </div>
  )
}

function compacto(v: number): string {
  return v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))
}

export function Barras({ grupos, ingresos, gastos }: { grupos: GrupoTendencia[]; ingresos: number[]; gastos: number[] }) {
  const W = 320
  const H = 150
  const margen = { izq: 30, der: 4, arr: 8, abajo: 20 }
  const max = Math.max(1, ...ingresos, ...gastos)
  const ancho = (W - margen.izq - margen.der) / grupos.length
  const alto = H - margen.arr - margen.abajo
  const y = (v: number) => margen.arr + alto - (v / max) * alto
  const barra = Math.max(1.5, Math.min(9, ancho * 0.36))
  // Con muchas barras (un mes) solo se rotulan algunas
  const cada = grupos.length > 12 ? Math.ceil(grupos.length / 6) : 1
  return (
    <svg className="fz-barras" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Barras de ingresos y gastos del periodo.">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={margen.izq} x2={W - margen.der} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeWidth="0.6" />
          <text x={margen.izq - 4} y={y(max * f) + 3} textAnchor="end" className="fz-eje">{compacto(max * f)}</text>
        </g>
      ))}
      {grupos.map((g, i) => {
        const x0 = margen.izq + i * ancho + ancho / 2
        return (
          <g key={g.desde}>
            <rect x={x0 - barra - 0.5} width={barra} y={y(ingresos[i])} height={Math.max(0, margen.arr + alto - y(ingresos[i]))} rx="1.5" fill="var(--green)">
              <title>{`${g.etiqueta}: ingresos ${soles(ingresos[i])}`}</title>
            </rect>
            <rect x={x0 + 0.5} width={barra} y={y(gastos[i])} height={Math.max(0, margen.arr + alto - y(gastos[i]))} rx="1.5" fill="var(--red)">
              <title>{`${g.etiqueta}: gastos ${soles(gastos[i])}`}</title>
            </rect>
            {i % cada === 0 && (
              <text x={x0} y={H - 5} textAnchor="middle" className="fz-eje">{g.etiqueta}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
