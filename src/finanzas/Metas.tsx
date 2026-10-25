import { useState } from 'react'
import { useAviso } from '../ui/Aviso'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useFinanzas } from './FinanzasProvider'
import { MAX_NOMBRE_META, esFecha, fechaLocal, parsearMonto } from './modelo'
import { datosDeMeta, validarAporte } from './repo'
import { fechaCorta, sumarDias } from './periodos'
import { ordenarMetas, progresoMeta, type ProgresoMeta } from './metas'
import type { Meta } from './tipos'
import { BarraProgreso, Monto, Segmentado, Vacio } from './ui'

function Detalle({ meta, p }: { meta: Meta; p: ProgresoMeta }) {
  if (p.cumplida) return <p className="fz-meta-estado cumplida">¡Meta cumplida!</p>
  if (p.vencida)
    return (
      <p className="fz-meta-estado vencida">
        La fecha límite ({fechaCorta(meta.limite!)}) ya pasó. Faltan <Monto valor={p.faltante} />.
      </p>
    )
  if (p.porMes != null)
    return (
      <p className="fz-meta-estado">
        Ahorra <Monto valor={p.porMes} /> al mes hasta el {fechaCorta(meta.limite!)}.
      </p>
    )
  return (
    <p className="fz-meta-estado">
      Faltan <Monto valor={p.faltante} />.
    </p>
  )
}

export function Metas() {
  const { metas } = useFinanzas()
  const [formulario, setFormulario] = useState<{ meta?: Meta } | null>(null)
  const [aporte, setAporte] = useState<{ meta: Meta; modo: 'aportar' | 'retirar' } | null>(null)
  const hoy = fechaLocal()
  return (
    <div className="fz-vista">
      <p className="fz-nota">El dinero de las metas se lleva aparte: no cambia el saldo de Digital ni Efectivo.</p>
      {metas == null ? (
        <Vacio>Cargando metas…</Vacio>
      ) : metas.length ? (
        ordenarMetas(metas).map((m) => {
          const p = progresoMeta(m, hoy)
          return (
            <section key={m.id} className="fz-tarjeta fz-meta">
              <div className="fz-tarjeta-cab">
                <h2>{m.nombre}</h2>
                <button type="button" className="icono-btn" aria-label={`Editar meta ${m.nombre}`} onClick={() => setFormulario({ meta: m })}>
                  <Icono nombre="opciones" tam={20} />
                </button>
              </div>
              <p className="fz-meta-avance">
                <Monto valor={p.ahorrado} className="cifra fz-meta-ahorrado" /> <span className="fz-suave">de</span> <Monto valor={m.objetivo} />
                <span className="fz-meta-pct">{Math.round(p.pct * 100)} %</span>
              </p>
              <BarraProgreso fraccion={p.pct} nivel="meta" etiqueta={`${m.nombre}: ${Math.round(p.pct * 100)} % ahorrado`} />
              <Detalle meta={m} p={p} />
              <div className="acciones">
                <button type="button" className="btn suave" onClick={() => setAporte({ meta: m, modo: 'aportar' })}>Aportar</button>
                <button type="button" className="btn suave" disabled={p.ahorrado <= 0} onClick={() => setAporte({ meta: m, modo: 'retirar' })}>Retirar</button>
              </div>
            </section>
          )
        })
      ) : (
        <section className="fz-tarjeta">
          <Vacio>Todavía no tienes metas. Crea una para empezar a ahorrar.</Vacio>
        </section>
      )}
      <button type="button" className="btn fz-ancho" onClick={() => setFormulario({})}>Nueva meta</button>

      <Hoja titulo={formulario?.meta ? 'Editar meta' : 'Nueva meta'} abierta={formulario !== null} alCerrar={() => setFormulario(null)}>
        {formulario && <FormMeta key={formulario.meta?.id ?? 'nueva'} meta={formulario.meta} alCerrar={() => setFormulario(null)} />}
      </Hoja>
      <Hoja titulo={aporte?.meta.nombre ?? ''} abierta={aporte !== null} alCerrar={() => setAporte(null)}>
        {aporte && <FormAporte key={aporte.meta.id + aporte.modo} meta={aporte.meta} modoInicial={aporte.modo} alCerrar={() => setAporte(null)} />}
      </Hoja>
    </div>
  )
}

function FormMeta({ meta, alCerrar }: { meta?: Meta; alCerrar: () => void }) {
  const { datos, alFallar } = useFinanzas()
  const avisar = useAviso()
  const [nombre, setNombre] = useState(meta?.nombre ?? '')
  const [objetivo, setObjetivo] = useState(meta ? String(meta.objetivo) : '')
  const [limite, setLimite] = useState(meta?.limite ?? '')
  const [error, setError] = useState('')

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const campos = { nombre, objetivo: parsearMonto(objetivo), limite }
    try {
      datosDeMeta(campos) // si algo está mal, avisa aquí (los de la base de datos llegan después)
      if (meta) datos.actualizarMeta(meta, campos).catch(alFallar)
      else datos.crearMeta(campos).listo.catch(alFallar)
    } catch (err) {
      if ((err as { code?: string }).code !== 'app/validacion') throw err
      return setError((err as Error).message)
    }
    alCerrar()
    avisar(meta ? 'Meta actualizada' : 'Meta creada')
  }
  const eliminar = () => {
    alCerrar()
    datos.eliminarMeta(meta!).catch(alFallar)
    avisar('Meta eliminada', 'ok', { accion: 'Deshacer', alAccion: () => datos.restaurarMeta(meta!).catch(alFallar) })
  }
  return (
    <form className="fz-form" noValidate onSubmit={guardar}>
      <div className="campo">
        <label htmlFor="fz-meta-nombre">Nombre</label>
        <input id="fz-meta-nombre" className="fz-texto" type="text" maxLength={MAX_NOMBRE_META} placeholder="Por ejemplo: Laptop nueva" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus={!meta} />
      </div>
      <div className="campo">
        <label htmlFor="fz-meta-objetivo">Objetivo</label>
        <span className="fz-monto-envoltura">
          <span className="fz-monto-prefijo cifra">S/</span>
          <input id="fz-meta-objetivo" className="fz-monto-campo cifra" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" aria-label="Monto objetivo en soles" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
        </span>
      </div>
      <div className="campo">
        <label htmlFor="fz-meta-limite">Fecha límite (opcional)</label>
        <div className="fz-fecha">
          <input id="fz-meta-limite" className="fz-texto" type="date" min={fechaLocal()} value={limite} onChange={(e) => setLimite(e.target.value)} />
          <button type="button" className="fz-chip" onClick={() => setLimite('')}>Sin fecha</button>
        </div>
      </div>
      {error && <p className="fz-error" role="alert">{error}</p>}
      <div className="acciones">
        {meta && <button type="button" className="btn peligro" onClick={eliminar}>Eliminar</button>}
        <button type="submit" className="btn">Guardar</button>
      </div>
    </form>
  )
}

function FormAporte({ meta, modoInicial, alCerrar }: { meta: Meta; modoInicial: 'aportar' | 'retirar'; alCerrar: () => void }) {
  const { datos, alFallar } = useFinanzas()
  const avisar = useAviso()
  const hoy = fechaLocal()
  const [modo, setModo] = useState(modoInicial)
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [error, setError] = useState('')
  const { ahorrado } = progresoMeta(meta, hoy)

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const valor = parsearMonto(cantidad)
    if (!(valor > 0)) return setError('Ingresa un monto mayor que 0.')
    if (!esFecha(fecha)) return setError('Elige una fecha válida.')
    const firmado = modo === 'retirar' ? -valor : valor
    try {
      validarAporte(meta, firmado, fecha)
      datos.aportarAMeta(meta, firmado, fecha).catch(alFallar)
    } catch (err) {
      if ((err as { code?: string }).code !== 'app/validacion') throw err
      return setError((err as Error).message)
    }
    alCerrar()
    const cumplida = progresoMeta({ ...meta, aportes: [...(meta.aportes ?? []), { id: 'x', monto: firmado, fecha }] }, hoy).cumplida
    avisar(cumplida && modo === 'aportar' ? `¡Meta cumplida! ${meta.nombre} llegó a su objetivo.` : modo === 'aportar' ? 'Aporte registrado' : 'Retiro registrado')
  }
  return (
    <form className="fz-form" noValidate onSubmit={guardar}>
      <Segmentado opciones={[{ id: 'aportar', nombre: 'Aportar' }, { id: 'retirar', nombre: 'Retirar' }]} valor={modo} etiqueta="Aportar o retirar" ancho alCambiar={setModo} />
      <p className="fz-suave">Ahorrado en esta meta: <Monto valor={ahorrado} /></p>
      <label className="fz-monto-envoltura">
        <span className="fz-monto-prefijo cifra">S/</span>
        <input className="fz-monto-campo cifra" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" aria-label="Monto en soles" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
      </label>
      <div className="campo">
        <span className="etiqueta">Fecha</span>
        <div className="fz-fecha">
          {([['Hoy', hoy], ['Ayer', sumarDias(hoy, -1)]] as const).map(([t, v]) => (
            <button key={t} type="button" className="fz-chip" aria-pressed={fecha === v} onClick={() => setFecha(v)}>{t}</button>
          ))}
          <input className="fz-texto" type="date" aria-label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      {error && <p className="fz-error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" className="btn">Guardar</button>
      </div>
    </form>
  )
}
