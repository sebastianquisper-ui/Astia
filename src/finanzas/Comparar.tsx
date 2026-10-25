import { useEffect, useState } from 'react'
import { useFinanzas } from './FinanzasProvider'
import { esFecha, fechaLocal } from './modelo'
import { PERIODOS, etiquetaPeriodo, moverPeriodo, rangoPeriodo } from './periodos'
import { compararPeriodos, deMedio, type Comparacion } from './resumen'
import type { Movimiento, Periodo, TipoPeriodo } from './tipos'
import { Monto, Vacio } from './ui'

function SelectorComparado({ letra, periodo, alCambiar }: { letra: 'A' | 'B'; periodo: Periodo; alCambiar: (p: Periodo) => void }) {
  return (
    <div className="fz-comparar-periodo">
      <span className="fz-comparar-letra">{letra}</span>
      <select className="fz-texto" aria-label={`Tipo del periodo ${letra}`} value={periodo.tipo} onChange={(e) => alCambiar({ ...periodo, tipo: e.target.value as TipoPeriodo })}>
        {PERIODOS.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <input className="fz-texto" type="date" aria-label={`Fecha del periodo ${letra}`} value={periodo.ref} onChange={(e) => esFecha(e.target.value) && alCambiar({ ...periodo, ref: e.target.value })} />
      <span className="fz-comparar-etiqueta">{etiquetaPeriodo(periodo.tipo, periodo.ref)}</span>
    </div>
  )
}

/** Compara dos periodos: ingresos, gastos, balance y qué categoría cambió más. */
export function Comparar() {
  const { datos, medio, alFallar } = useFinanzas()
  const hoy = fechaLocal()
  const [a, setA] = useState<Periodo>({ tipo: 'mes', ref: hoy })
  const [b, setB] = useState<Periodo>({ tipo: 'mes', ref: moverPeriodo('mes', hoy, -1) })
  const [movs, setMovs] = useState<{ a: Movimiento[]; b: Movimiento[] } | null>(null)

  // Lee los dos periodos una sola vez (sin escuchar) cuando cambian
  useEffect(() => {
    let vigente = true
    setMovs(null)
    const ra = rangoPeriodo(a.tipo, a.ref)
    const rb = rangoPeriodo(b.tipo, b.ref)
    Promise.all([datos.movimientosEntre(ra.desde, ra.hasta), datos.movimientosEntre(rb.desde, rb.hasta)])
      .then(([ma, mb]) => vigente && setMovs({ a: ma, b: mb }))
      .catch((err) => vigente && alFallar(err))
    return () => {
      vigente = false
    }
  }, [datos, a, b, alFallar])

  const r: Comparacion | null = movs ? compararPeriodos(deMedio(movs.a, medio), deMedio(movs.b, medio)) : null
  return (
    <div className="fz-comparar-cuerpo">
      <SelectorComparado letra="A" periodo={a} alCambiar={setA} />
      <SelectorComparado letra="B" periodo={b} alCambiar={setB} />
      {!r ? (
        <Vacio>Cargando…</Vacio>
      ) : (
        <>
          <table className="fz-tabla">
            <thead>
              <tr><th /><th scope="col">A</th><th scope="col">B</th></tr>
            </thead>
            <tbody>
              {([['Ingresos', r.a.ingresos, r.b.ingresos], ['Gastos', r.a.gastos, r.b.gastos], ['Balance', r.a.balance, r.b.balance]] as const).map(([t, x, y]) => (
                <tr key={t}>
                  <th scope="row">{t}</th>
                  <td><Monto valor={x} /></td>
                  <td><Monto valor={y} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={'fz-diferencia ' + (r.difGasto > 0 ? 'mas' : r.difGasto < 0 ? 'menos' : '')}>
            Diferencia de gasto (A − B): <Monto valor={r.difGasto} signo />
            <span className="fz-suave">{r.difGasto > 0 ? ' · gastaste más en A' : r.difGasto < 0 ? ' · gastaste menos en A' : ' · igual'}</span>
          </p>
          {r.porCategoria.length ? (
            <table className="fz-tabla">
              <caption>Gastos por categoría</caption>
              <thead>
                <tr><th scope="col">Categoría</th><th scope="col">A</th><th scope="col">B</th><th scope="col">A − B</th></tr>
              </thead>
              <tbody>
                {r.porCategoria.map((x) => (
                  <tr key={x.categoria}>
                    <th scope="row">{x.categoria}</th>
                    <td><Monto valor={x.a} /></td>
                    <td><Monto valor={x.b} /></td>
                    <td className={x.dif > 0 ? 'mas' : x.dif < 0 ? 'menos' : ''}><Monto valor={x.dif} signo /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Vacio>Sin gastos en ninguno de los dos periodos.</Vacio>
          )}
        </>
      )}
    </div>
  )
}
