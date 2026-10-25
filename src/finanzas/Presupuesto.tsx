import { useEffect, useState } from 'react'
import { useAviso } from '../ui/Aviso'
import { useFinanzas } from './FinanzasProvider'
import { NOMBRE_MEDIO, porcentaje } from './formato'
import { MEDIOS, fechaLocal, parsearMonto } from './modelo'
import { etiquetaPeriodo } from './periodos'
import { estadoPresupuesto, type FilaPresupuesto } from './presupuesto'
import type { Medio } from './tipos'
import { BarraProgreso, Monto, Segmentado } from './ui'

function Restante({ restante }: { restante: number }) {
  return restante >= 0 ? (
    <span>Te quedan <Monto valor={restante} /></span>
  ) : (
    <span className="fz-excedido">Te pasaste por <Monto valor={-restante} /></span>
  )
}

function CampoTope({ medio, fila }: { medio: Medio; fila: FilaPresupuesto }) {
  const { datos, alFallar } = useFinanzas()
  const avisar = useAviso()
  const [texto, setTexto] = useState(fila.tope ? String(fila.tope) : '')
  useEffect(() => setTexto(fila.tope ? String(fila.tope) : ''), [fila.tope])
  const guardar = () => {
    const limpio = texto.trim()
    const tope = limpio ? parsearMonto(limpio) : 0
    if (Number.isNaN(tope) || tope < 0) {
      avisar('Escribe un monto válido, por ejemplo 200 o 150,50.')
      return setTexto(fila.tope ? String(fila.tope) : '')
    }
    if ((tope || null) === fila.tope) return
    datos.definirPresupuesto(medio, fila.categoria, tope || null).catch(alFallar)
  }
  return (
    <label className="fz-tope">
      <span className="fz-tope-etiqueta">Tope mensual</span>
      <span className="fz-tope-prefijo">S/</span>
      <input className="fz-texto" type="text" inputMode="decimal" autoComplete="off" placeholder="Sin tope" aria-label={`Tope mensual de ${fila.categoria}`} enterKeyHint="done" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={guardar} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
    </label>
  )
}

export function Presupuesto() {
  const { config, movsMes, medio, setMedio } = useFinanzas()
  const { filas, total } = estadoPresupuesto(movsMes, config, medio)
  const mes = etiquetaPeriodo('mes', fechaLocal())
  return (
    <div className="fz-vista">
      <Segmentado opciones={MEDIOS.map((m) => ({ id: m, nombre: NOMBRE_MEDIO[m] }))} valor={medio} etiqueta="Billetera" ancho alCambiar={setMedio} />
      <section className="fz-tarjeta">
        <h2 className="fz-titulo-mes">Presupuesto de <span>{mes}</span></h2>
        {total.tope ? (
          <>
            <p className="fz-presupuesto-total cifra">
              <Monto valor={total.gastado} /> <span className="fz-suave">de</span> <Monto valor={total.tope} />
            </p>
            <BarraProgreso fraccion={total.gastado / total.tope} nivel={total.nivel} etiqueta={`Total: ${porcentaje(total.gastado, total.tope)} del presupuesto`} />
            <p className="fz-restante">
              <Restante restante={total.restante} />
              <span className="fz-suave"> · {porcentaje(total.gastado, total.tope)}</span>
            </p>
          </>
        ) : (
          <p className="fz-suave">Aún no tienes topes para {NOMBRE_MEDIO[medio]}. Escribe un monto en cada categoría; se aplica a cada mes.</p>
        )}
      </section>
      <section className="fz-tarjeta">
        <h2>Por categoría</h2>
        <ul className="fz-presupuesto-lista">
          {filas.map((f) => (
            <li key={medio + f.categoria} className="fz-presupuesto-fila">
              <div className="fz-presupuesto-cab">
                <span className="fz-presupuesto-categoria">{f.categoria}</span>
                {f.tope && <span className={'fz-pct nivel-texto-' + f.nivel}>{porcentaje(f.gastado, f.tope)}</span>}
              </div>
              <p className="fz-presupuesto-detalle">
                {f.tope ? (
                  <>
                    <Monto valor={f.gastado} /> de <Monto valor={f.tope} />
                  </>
                ) : (
                  <>
                    <Monto valor={f.gastado} /> gastado · sin tope
                  </>
                )}
              </p>
              {f.tope && <BarraProgreso fraccion={f.gastado / f.tope} nivel={f.nivel} etiqueta={`${f.categoria}: ${porcentaje(f.gastado, f.tope)} del tope`} />}
              {f.tope && f.restante !== null && (
                <p className="fz-restante">
                  <Restante restante={f.restante} />
                </p>
              )}
              <CampoTope medio={medio} fila={f} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
