import { useState } from 'react'
import { HeroFinanzas } from './HeroFinanzas'
import { Comparar } from './Comparar'
import { useFinanzas } from './FinanzasProvider'
import { Barras, Dona, porcionesDona } from './graficos'
import { porcentaje } from './formato'
import { gruposTendencia } from './periodos'
import { alertas, estadoPresupuesto } from './presupuesto'
import { FILTROS_INICIALES, deMedio, gastosPorCategoria, ordenarRecientes, tendencia, totales, type Totales } from './resumen'
import { Icono } from '../ui/Icono'
import { TarjetaRecomienda } from '../ui/TarjetaRecomienda'
import { estadoDinero } from './estado'
import { Billeteras, FilaMovimiento, Monto, SelectorPeriodo, Vacio } from './ui'

function Resumen({ t }: { t: Totales }) {
  const tarjeta = (titulo: string, valor: number, clase: string) => (
    <div className={'fz-resumen-tarjeta ' + clase}>
      <span className="fz-resumen-titulo">{titulo}</span>
      <Monto valor={valor} className="cifra" />
    </div>
  )
  return (
    <section className="fz-resumen" aria-label="Resumen del periodo">
      {tarjeta('Ingresos', t.ingresos, 'ingreso')}
      {tarjeta('Gastos', t.gastos, 'gasto')}
      {tarjeta('Balance', t.balance, t.balance < 0 ? 'negativo' : 'balance')}
    </section>
  )
}

function AvisoPresupuesto() {
  const { config, movsMes, medio, irA } = useFinanzas()
  const lista = alertas(estadoPresupuesto(movsMes, config, medio))
  if (!lista.length) return null
  const excedidas = lista.filter((f) => f.nivel === 'excedido')
  const cerca = lista.filter((f) => f.nivel === 'alerta')
  const texto = [
    excedidas.length ? `Pasaste el tope en ${excedidas.map((f) => f.categoria).join(', ')}.` : null,
    cerca.length ? `Cerca del tope: ${cerca.map((f) => `${f.categoria} (${Math.round((f.gastado / (f.tope as number)) * 100)} %)`).join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={'fz-aviso-presupuesto ' + (excedidas.length ? 'excedido' : 'alerta')} onClick={() => irA('presupuesto')}>
      <b>{excedidas.length ? 'Presupuesto excedido' : 'Presupuesto al 70 %'}</b>
      <span>{texto}</span>
      <span className="fz-aviso-ir">Ver presupuesto</span>
    </button>
  )
}

export function Inicio() {
  const { movs, config, movsMes, medio, periodo, irA, abrirDictado } = useFinanzas()
  const [compararAbierto, setCompararAbierto] = useState(false)
  const delMedio = movs ? deMedio(movs, medio) : []
  const porCategoria = gastosPorCategoria(delMedio)
  const porciones = porcionesDona(porCategoria, config.categoriasGasto)
  const totalGastos = porciones.reduce((s, p) => s + p.total, 0)
  const grupos = gruposTendencia(periodo.tipo, periodo.ref)
  const ultimos = ordenarRecientes(delMedio).slice(0, 5)

  return (
    <div className="fz-vista">
      <HeroFinanzas />
      {/* Aquí ya pusiste el PIN: la plata entra a la recomendación sin pedir permiso aparte */}
      <TarjetaRecomienda plata={estadoDinero({ config, movsMes }).estado} />
      <button type="button" className="fz-dictar" onClick={abrirDictado}>
        <Icono nombre="mic" tam={22} />
        <span>
          <b>Dictar un movimiento</b>
          <small>Di "gasté 15 soles en almuerzo" y Alpi lo anota</small>
        </span>
      </button>
      <Billeteras />
      <SelectorPeriodo />
      <Resumen t={totales(delMedio)} />
      <AvisoPresupuesto />

      <section className="fz-tarjeta">
        <h2>Gastos por categoría</h2>
        {!porciones.length ? (
          <Vacio>Sin gastos en este periodo.</Vacio>
        ) : (
          <>
            <Dona porciones={porciones} centro={<><span className="fz-dona-etiqueta">Total</span><Monto valor={totalGastos} className="cifra" /></>} />
            <ul className="fz-leyenda">
              {porciones.map((p) => {
                const contenido = (
                  <>
                    <span className="fz-leyenda-color" style={{ background: p.color }} />
                    <span className="fz-leyenda-nombre">{p.etiqueta}</span>
                    <Monto valor={p.total} className="fz-leyenda-monto" />
                    <span className="fz-leyenda-pct">{porcentaje(p.total, totalGastos)}</span>
                  </>
                )
                return (
                  <li key={p.etiqueta}>
                    {p.categoria ? (
                      <button type="button" className="fz-leyenda-fila" aria-label={`Ver movimientos de ${p.categoria}`} onClick={() => irA('movimientos', { ...FILTROS_INICIALES, tipo: 'gasto', categoria: p.categoria })}>
                        {contenido}
                      </button>
                    ) : (
                      <div className="fz-leyenda-fila">{contenido}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {grupos && (
        <section className="fz-tarjeta">
          <div className="fz-tarjeta-cab">
            <h2>Tendencia del periodo</h2>
            <ul className="fz-serie" aria-label="Series">
              <li><span className="fz-leyenda-color ingreso" />Ingresos</li>
              <li><span className="fz-leyenda-color gasto" />Gastos</li>
            </ul>
          </div>
          <Barras grupos={grupos} {...tendencia(delMedio, grupos)} />
        </section>
      )}

      <section className="fz-tarjeta">
        <div className="fz-tarjeta-cab">
          <h2>Últimos movimientos</h2>
          <button type="button" className="fz-enlace" onClick={() => irA('movimientos', { ...FILTROS_INICIALES })}>Ver todos</button>
        </div>
        {ultimos.length ? (
          <ul className="fz-lista">
            {ultimos.map((m) => (
              <FilaMovimiento key={m.id} m={m} conFecha />
            ))}
          </ul>
        ) : (
          <Vacio>Todavía no hay movimientos en este periodo. Toca + para registrar uno.</Vacio>
        )}
      </section>

      <details className="fz-tarjeta fz-comparar" open={compararAbierto} onToggle={(e) => setCompararAbierto((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <h2>Comparar dos periodos</h2>
        </summary>
        {compararAbierto && <Comparar />}
      </details>
    </div>
  )
}
