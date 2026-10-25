import { useEffect, useRef, useState } from 'react'
import { hayDictado, useDictado } from '../lib/dictado'
import { sonar } from '../sonidos/reproductor'
import { useAviso } from '../ui/Aviso'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { interpretar, type Interpretacion } from './dictado'
import { useAvisarGuardado } from './FormMovimiento'
import { useFinanzas } from './FinanzasProvider'
import { NOMBRE_MEDIO, soles } from './formato'
import { fechaLocal } from './modelo'
import { progresoMeta } from './metas'
import { etiquetaDia } from './periodos'
import { validarAporte } from './repo'
import type { Meta } from './tipos'

/** Dictar un movimiento: dices o escribes qué pasó con tu plata, Alpi lo entiende y te lo muestra para confirmar. */
export function DictadoFinanzas({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  return (
    <Hoja titulo="Dictar un movimiento" abierta={abierto} alCerrar={alCerrar}>
      {abierto && <Contenido alCerrar={alCerrar} />}
    </Hoja>
  )
}

function Contenido({ alCerrar }: { alCerrar: () => void }) {
  const { config, metas, medio, datos, alFallar, abrirFormulario } = useFinanzas()
  const avisarGuardado = useAvisarGuardado()
  const avisar = useAviso()
  const { escuchando, dictar } = useDictado()
  const [texto, setTexto] = useState('')
  const [res, setRes] = useState<Interpretacion | null>(null)
  const [metaElegida, setMetaElegida] = useState<Meta | null>(null)
  const [entendiendo, setEntendiendo] = useState(false)
  const campo = useRef<HTMLTextAreaElement>(null)
  useEffect(() => campo.current?.focus(), [])

  const entender = async (frase: string) => {
    if (!frase.trim()) return
    setEntendiendo(true)
    try {
      const r = await interpretar(frase, { config, metas: metas ?? [], hoy: fechaLocal(), medioPorDefecto: medio })
      setRes(r)
      setMetaElegida(r.tipo === 'aporte' || r.tipo === 'retiro' ? r.meta : null)
    } finally {
      setEntendiendo(false)
    }
  }

  const hablar = () =>
    dictar(
      (t) => {
        setTexto(t)
        void entender(t)
      },
      () => avisar('No se pudo usar el micrófono. Usa el del teclado del iPhone: toca el micrófono del teclado y dicta aquí.', 'error'),
    )

  const otraVez = () => {
    setRes(null)
    setTexto('')
    setMetaElegida(null)
    campo.current?.focus()
  }

  const corregir = () => {
    if (!res || res.tipo === 'nada' || res.tipo === 'aporte' || res.tipo === 'retiro') return
    alCerrar()
    if (res.tipo === 'transferencia') abrirFormulario({ previo: { tipo: 'transferencia', monto: res.monto, origen: res.origen, fecha: res.fecha, nota: res.nota } })
    else abrirFormulario({ previo: { tipo: res.tipo, monto: res.monto, categoria: res.categoria, medio: res.medio, fecha: res.fecha, nota: res.nota } })
  }

  const guardar = () => {
    if (!res || res.tipo === 'nada') return
    try {
      if (res.tipo === 'gasto' || res.tipo === 'ingreso') {
        if (!res.categoria) return
        const nuevo = { tipo: res.tipo, medio: res.medio, monto: res.monto, fecha: res.fecha, nota: res.nota, categoria: res.categoria }
        datos.crearMovimiento(nuevo).listo.catch(alFallar)
        const existentes = res.tipo === 'ingreso' ? config.categoriasIngreso : config.categoriasGasto
        if (res.categoriaNueva && !existentes.includes(res.categoria)) datos.guardarCategorias(res.tipo, [...existentes, res.categoria]).catch(alFallar)
        alCerrar()
        avisarGuardado(res.tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado', res.fecha, nuevo)
      } else if (res.tipo === 'transferencia') {
        datos.crearTransferencia({ origen: res.origen, destino: res.destino, monto: res.monto, fecha: res.fecha, nota: res.nota }).listo.catch(alFallar)
        alCerrar()
        avisarGuardado('Transferencia registrada', res.fecha, null)
      } else {
        const meta = metaElegida
        if (!meta) return
        const firmado = res.tipo === 'retiro' ? -res.monto : res.monto
        validarAporte(meta, firmado, res.fecha)
        datos.aportarAMeta(meta, firmado, res.fecha).catch(alFallar)
        alCerrar()
        const cumplida = progresoMeta({ ...meta, aportes: [...meta.aportes, { id: 'x', monto: firmado, fecha: res.fecha }] }, fechaLocal()).cumplida
        if (cumplida && res.tipo === 'aporte') void sonar('metaCumplida')
        avisar(cumplida && res.tipo === 'aporte' ? `¡Meta cumplida! ${meta.nombre} llegó a su objetivo.` : res.tipo === 'aporte' ? 'Aporte registrado' : 'Retiro registrado')
      }
    } catch (err) {
      if ((err as { code?: string }).code !== 'app/validacion') throw err
      avisar((err as Error).message, 'error')
    }
  }

  const bloqueado = !res || res.tipo === 'nada' || ((res.tipo === 'gasto' || res.tipo === 'ingreso') && !res.categoria) || ((res.tipo === 'aporte' || res.tipo === 'retiro') && !metaElegida)

  return (
    <div className="fz-form fz-dictado">
      <p className="fz-suave">
        Dime qué pasó con tu plata. Por ejemplo: <em>"gasté 15 soles en almuerzo"</em>, <em>"me llegó un ingreso de 200 por sueldo"</em>, <em>"pasé 50 de digital a efectivo"</em> o <em>"aporté 100 a mi laptop"</em>.
      </p>
      <textarea ref={campo} className="fz-texto fz-dictado-texto" rows={3} aria-label="Frase del movimiento" placeholder="Habla o escribe aquí…" value={texto} onChange={(e) => (setTexto(e.target.value), setRes(null))} />
      <div className="acciones">
        {hayDictado() && (
          <button type="button" className={'btn suave' + (escuchando ? ' escuchando' : '')} onClick={hablar} aria-pressed={escuchando}>
            <Icono nombre="mic" tam={18} /> {escuchando ? 'Escuchando… toca para parar' : 'Hablar'}
          </button>
        )}
        <button type="button" className="btn" onClick={() => entender(texto)} disabled={!texto.trim() || entendiendo}>Entender</button>
      </div>
      {!hayDictado() && <p className="fz-nota">Para dictar usa el micrófono del teclado del iPhone: toca el micrófono del teclado y habla. Escribirá la frase aquí.</p>}

      {res && (
        <section className="fz-entendi" aria-live="polite">
          {res.tipo === 'nada' ? (
            <p className="fz-error" role="alert">{res.motivo}</p>
          ) : (
            <>
              <h3>Entendí</h3>
              <ul className="fz-entendi-lista">
                <li><b>{res.tipo === 'gasto' ? 'Gasto' : res.tipo === 'ingreso' ? 'Ingreso' : res.tipo === 'transferencia' ? 'Transferencia' : res.tipo === 'aporte' ? 'Aporte a una meta' : 'Retiro de una meta'}</b> · <span className="monto">{soles(res.monto)}</span></li>
                {(res.tipo === 'gasto' || res.tipo === 'ingreso') && (
                  <>
                    <li>Categoría: {res.categoria ? res.categoria + (res.categoriaNueva ? ' (nueva)' : '') : '—'}</li>
                    <li>Billetera: {NOMBRE_MEDIO[res.medio]}</li>
                  </>
                )}
                {res.tipo === 'transferencia' && <li>De {NOMBRE_MEDIO[res.origen]} a {NOMBRE_MEDIO[res.destino]}</li>}
                {(res.tipo === 'aporte' || res.tipo === 'retiro') && <li>Meta: {metaElegida ? metaElegida.nombre : '—'}</li>}
                <li>Fecha: {etiquetaDia(res.fecha)}</li>
                {'nota' in res && res.nota && <li>Nota: {res.nota}</li>}
              </ul>
              {res.dudas.length > 0 && (
                <ul className="fz-dudas">
                  {res.dudas.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              {(res.tipo === 'aporte' || res.tipo === 'retiro') && !res.meta && (metas ?? []).length > 0 && (
                <div className="fz-chips" role="group" aria-label="Elige la meta">
                  {(metas ?? []).map((m) => (
                    <button key={m.id} type="button" className="fz-chip" aria-pressed={metaElegida?.id === m.id} onClick={() => setMetaElegida(m)}>{m.nombre}</button>
                  ))}
                </div>
              )}
              <div className="acciones">
                <button type="button" className="btn suave" onClick={otraVez}>Otra vez</button>
                {res.tipo !== 'aporte' && res.tipo !== 'retiro' && <button type="button" className="btn suave" onClick={corregir}>Corregir</button>}
                <button type="button" className="btn" onClick={guardar} disabled={bloqueado}>Guardar</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
