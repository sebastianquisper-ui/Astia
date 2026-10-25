import { useEffect, useRef, useState } from 'react'
import { useAviso } from '../ui/Aviso'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useFinanzas, type OpcionesFormulario } from './FinanzasProvider'
import { NOMBRE_MEDIO, soles } from './formato'
import { MAX_CATEGORIA, MAX_NOTA, MEDIOS, esFecha, esTransferencia, fechaLocal, parsearMonto } from './modelo'
import { rangoPeriodo, sumarDias } from './periodos'
import { limpiarMovimiento } from './repo'
import { avisoTrasGasto, type AvisoGasto } from './presupuesto'
import { Segmentado } from './ui'
import type { Medio } from './tipos'

type Tipo = 'gasto' | 'ingreso' | 'transferencia'
const TIPOS: { id: Tipo; nombre: string }[] = [
  { id: 'gasto', nombre: 'Gasto' },
  { id: 'ingreso', nombre: 'Ingreso' },
  { id: 'transferencia', nombre: 'Transferir' },
]
const otroMedio = (m: Medio): Medio => (m === 'digital' ? 'efectivo' : 'digital')

export function textoAvisoPresupuesto(a: AvisoGasto): string {
  return a.nivel === 'excedido' ? `${a.categoria} pasó su presupuesto: ${soles(a.gastado)} de ${soles(a.tope)}.` : `${a.categoria} va en ${a.pct} % de su presupuesto del mes.`
}

/** Registrar o editar un gasto, un ingreso o una transferencia entre billeteras. */
export function FormMovimiento({ opciones, alCerrar }: { opciones: OpcionesFormulario | null; alCerrar: () => void }) {
  const mov = opciones?.mov
  const titulo = mov ? (esTransferencia(mov) ? 'Editar transferencia' : 'Editar movimiento') : 'Nuevo movimiento'
  return (
    <Hoja titulo={titulo} abierta={opciones !== null} alCerrar={alCerrar}>
      {opciones && <Formulario key={mov?.id ?? 'nuevo' + (opciones.tipo ?? '')} opciones={opciones} alCerrar={alCerrar} />}
    </Hoja>
  )
}

function Formulario({ opciones, alCerrar }: { opciones: OpcionesFormulario; alCerrar: () => void }) {
  const { datos, config, movsMes, periodo, medio: medioActivo, alFallar } = useFinanzas()
  const avisar = useAviso()
  const mov = opciones.mov
  const editando = Boolean(mov)
  const esTransfer = editando && esTransferencia(mov!)
  const hoy = fechaLocal()

  const [tipo, setTipo] = useState<Tipo>(esTransfer ? 'transferencia' : (mov?.tipo ?? opciones.tipo ?? 'gasto'))
  const [medio, setMedio] = useState<Medio>(mov?.medio ?? medioActivo)
  const [origen, setOrigen] = useState<Medio>(esTransfer ? (mov!.tipo === 'gasto' ? mov!.medio : otroMedio(mov!.medio)) : medioActivo)
  const [categoria, setCategoria] = useState<string | null>(esTransfer ? null : (mov?.categoria ?? null))
  const [otra, setOtra] = useState(false)
  const [otraTexto, setOtraTexto] = useState('')
  const [monto, setMonto] = useState(mov ? String(mov.monto) : '')
  const [fecha, setFecha] = useState(mov?.fecha ?? hoy)
  const [nota, setNota] = useState(mov?.nota ?? '')
  const [error, setError] = useState('')
  const montoRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!editando) montoRef.current?.focus()
  }, [editando])

  const lista = [...(tipo === 'ingreso' ? config.categoriasIngreso : config.categoriasGasto)]
  if (categoria && !otra && !lista.includes(categoria)) lista.push(categoria) // una categoría que ya no está en la lista sigue visible

  const cambiarTipo = (t: Tipo) => {
    setTipo(t)
    if (t !== 'transferencia') {
      const nuevas = t === 'ingreso' ? config.categoriasIngreso : config.categoriasGasto
      if (categoria && !nuevas.includes(categoria)) setCategoria(null)
    }
  }

  const avisarGuardado = (texto: string, fechaMov: string, gasto: { tipo: 'gasto' | 'ingreso'; medio: Medio; categoria: string; monto: number } | null) => {
    const mes = rangoPeriodo('mes', hoy)
    const presupuesto = gasto && fechaMov >= mes.desde && fechaMov <= mes.hasta ? avisoTrasGasto(movsMes, config, gasto, mov ?? null) : null
    if (presupuesto) return avisar(`${texto}. ${textoAvisoPresupuesto(presupuesto)}`, 'ok', { duracion: 6000 })
    const { desde, hasta } = rangoPeriodo(periodo.tipo, periodo.ref)
    avisar(fechaMov < desde || fechaMov > hasta ? `${texto} (fuera del periodo que estás viendo)` : texto)
  }

  const guardar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const valor = parsearMonto(monto)
    const notaLimpia = nota.trim()
    if (!(valor > 0)) return setError('Ingresa un monto mayor que 0.')
    if (!esFecha(fecha)) return setError('Elige una fecha válida.')
    try {
      if (tipo === 'transferencia') {
        if (esTransfer) datos.actualizarTransferencia(mov!.transferId!, { monto: valor, fecha, nota: notaLimpia }).catch(alFallar)
        else datos.crearTransferencia({ origen, destino: otroMedio(origen), monto: valor, fecha, nota: notaLimpia }).listo.catch(alFallar)
        alCerrar()
        return avisarGuardado(esTransfer ? 'Transferencia actualizada' : 'Transferencia registrada', fecha, null)
      }
      const nombre = otra ? otraTexto.trim() : categoria
      if (!nombre) return setError(otra ? 'Escribe el nombre de la categoría.' : 'Elige una categoría.')
      const nuevo = { tipo, medio, monto: valor, fecha, nota: notaLimpia, categoria: nombre }
      const existentes = tipo === 'ingreso' ? config.categoriasIngreso : config.categoriasGasto
      limpiarMovimiento({ ...nuevo, creado: mov?.creado }) // si algo está mal, avisa aquí (los de la base de datos llegan después)
      if (editando) datos.actualizarMovimiento(mov!, nuevo).catch(alFallar)
      else datos.crearMovimiento(nuevo).listo.catch(alFallar)
      if (otra && !existentes.includes(nombre)) datos.guardarCategorias(tipo, [...existentes, nombre]).catch(alFallar)
      alCerrar()
      avisarGuardado(editando ? 'Cambios guardados' : tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado', fecha, nuevo)
    } catch (err) {
      if ((err as { code?: string }).code !== 'app/validacion') throw err
      setError((err as Error).message)
    }
  }

  const eliminar = async () => {
    alCerrar()
    try {
      const { borrados, listo } = await datos.eliminarMovimiento(mov!)
      listo.catch(alFallar)
      avisar(borrados.length > 1 ? 'Transferencia eliminada' : 'Movimiento eliminado', 'ok', { accion: 'Deshacer', alAccion: () => datos.restaurarMovimientos(borrados).catch(alFallar) })
    } catch (err) {
      alFallar(err)
    }
  }

  const destino = otroMedio(origen)
  return (
    <form className="fz-form" noValidate onSubmit={guardar}>
      {!esTransfer && <Segmentado opciones={editando ? TIPOS.slice(0, 2) : TIPOS} valor={tipo} etiqueta="Tipo" ancho alCambiar={cambiarTipo} />}

      <label className="fz-monto-envoltura">
        <span className="fz-monto-prefijo cifra">S/</span>
        <input ref={montoRef} className="fz-monto-campo cifra" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" aria-label="Monto en soles" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </label>

      {tipo === 'transferencia' ? (
        <div className="campo">
          <span className="etiqueta">Dirección</span>
          <div className="fz-direccion">
            <span>{NOMBRE_MEDIO[origen]}</span>
            <button type="button" className="icono-btn" aria-label="Invertir dirección" disabled={esTransfer} onClick={() => setOrigen(destino)}>
              <Icono nombre="cambiar" tam={18} />
            </button>
            <span>{NOMBRE_MEDIO[destino]}</span>
          </div>
          {esTransfer && <p className="nota">Para cambiar la dirección, elimínala y crea otra.</p>}
        </div>
      ) : (
        <>
          <div className="campo">
            <span className="etiqueta">Medio</span>
            <Segmentado opciones={MEDIOS.map((m) => ({ id: m, nombre: NOMBRE_MEDIO[m] }))} valor={medio} etiqueta="Medio" ancho alCambiar={setMedio} />
          </div>
          <div className="campo">
            <span className="etiqueta" id="fz-cat">Categoría</span>
            <div className="fz-chips" role="group" aria-labelledby="fz-cat">
              {lista.map((c) => (
                <button key={c} type="button" className="fz-chip" aria-pressed={!otra && categoria === c} onClick={() => (setCategoria(c), setOtra(false))}>
                  {c}
                </button>
              ))}
              <button type="button" className="fz-chip" aria-pressed={otra} onClick={() => setOtra(true)}>+ Otra</button>
            </div>
            {otra && <input className="fz-texto" type="text" maxLength={MAX_CATEGORIA} placeholder="Nombre de la categoría" aria-label="Nueva categoría" value={otraTexto} onChange={(e) => setOtraTexto(e.target.value)} autoFocus />}
          </div>
        </>
      )}

      <div className="campo">
        <span className="etiqueta">Fecha</span>
        <div className="fz-fecha">
          {(
            [['Hoy', hoy], ['Ayer', sumarDias(hoy, -1)]] as const
          ).map(([texto, valor]) => (
            <button key={texto} type="button" className="fz-chip" aria-pressed={fecha === valor} onClick={() => setFecha(valor)}>{texto}</button>
          ))}
          <input className="fz-texto" type="date" aria-label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      <input className="fz-texto" type="text" maxLength={MAX_NOTA} placeholder="Nota (opcional)" aria-label="Nota" value={nota} onChange={(e) => setNota(e.target.value)} />
      {error && <p className="fz-error" role="alert">{error}</p>}
      <div className="acciones">
        {editando && <button type="button" className="btn peligro" onClick={eliminar}>Eliminar</button>}
        <button type="submit" className="btn">Guardar</button>
      </div>
    </form>
  )
}
