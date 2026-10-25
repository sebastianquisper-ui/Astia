import { NOMBRE_MEDIO } from './formato'
import { MEDIOS } from './modelo'
import { etiquetaDia } from './periodos'
import { useFinanzas } from './FinanzasProvider'
import { agruparPorDia, deMedio, filtrar, type Filtros } from './resumen'
import { Icono } from '../ui/Icono'
import { Monto, Segmentado, SelectorPeriodo, Vacio, FilaMovimiento } from './ui'

const TIPOS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'gasto', nombre: 'Gastos' },
  { id: 'ingreso', nombre: 'Ingresos' },
] as const


export function Movimientos() {
  const { config, movs, historial, medio, setMedio, filtros, setFiltros } = useFinanzas()
  const cambiar = (parcial: Partial<Filtros>) => setFiltros({ ...filtros, ...parcial })

  const categorias = [...(filtros.tipo !== 'ingreso' ? config.categoriasGasto : []), ...(filtros.tipo !== 'gasto' ? config.categoriasIngreso : [])]
  // Una categoría filtrada que ya no está en la lista (por ejemplo "Efectivo", heredada) sigue visible
  if (filtros.categoria && !categorias.includes(filtros.categoria)) categorias.push(filtros.categoria)

  const fuente = filtros.historial ? historial : movs
  const visibles = fuente ? filtrar(deMedio(fuente, medio), filtros) : null
  const hayFiltro = Boolean(filtros.texto || filtros.categoria || filtros.tipo !== 'todos')

  return (
    <div className="fz-vista">
      <Segmentado opciones={MEDIOS.map((m) => ({ id: m, nombre: NOMBRE_MEDIO[m] }))} valor={medio} etiqueta="Billetera" ancho alCambiar={setMedio} />
      {!filtros.historial && <SelectorPeriodo />}
      <label className="fz-busqueda">
        <Icono nombre="buscar" tam={18} />
        <input type="search" placeholder="Buscar por nota, categoría o monto" aria-label="Buscar movimientos" enterKeyHint="search" value={filtros.texto} onChange={(e) => cambiar({ texto: e.target.value })} />
      </label>
      <Segmentado opciones={TIPOS.map((t) => ({ id: t.id, nombre: t.nombre }))} valor={filtros.tipo} etiqueta="Tipo de movimiento" alCambiar={(tipo) => cambiar({ tipo, categoria: null })} />
      <div className="fz-chips fz-scroll" role="group" aria-label="Filtrar por categoría">
        <button type="button" className="fz-chip" aria-pressed={filtros.historial} onClick={() => cambiar({ historial: !filtros.historial })}>Todo el historial</button>
        <span className="fz-separador" aria-hidden="true" />
        {categorias.map((c) => (
          <button key={c} type="button" className="fz-chip" aria-pressed={filtros.categoria === c} onClick={() => cambiar({ categoria: filtros.categoria === c ? null : c })}>
            {c}
          </button>
        ))}
      </div>

      <div className="fz-dias" aria-live="polite">
        {!visibles ? (
          <Vacio>{filtros.historial ? 'Cargando todo el historial…' : 'Cargando…'}</Vacio>
        ) : !visibles.length ? (
          <Vacio>{hayFiltro ? 'Ningún movimiento coincide con la búsqueda.' : 'No hay movimientos en este periodo.'}</Vacio>
        ) : (
          agruparPorDia(visibles).map((dia) => (
            <section key={dia.fecha} className="fz-dia">
              <h3 className="fz-dia-cab">
                <span>{etiquetaDia(dia.fecha)}</span>
                {!dia.soloTransferencias && <Monto valor={dia.neto} signo className="fz-dia-neto" />}
              </h3>
              <ul className="fz-lista">
                {dia.movs.map((m) => (
                  <FilaMovimiento key={m.id} m={m} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
