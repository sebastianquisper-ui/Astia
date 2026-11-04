import { useState } from 'react'
import { calendarioConectado, calendarioConfigurado, conectarCalendario, crearEventoTarea } from '../calendario/google'
import type { Curso, Tarea } from '../dominio/tipos'
import { MAX_ALARMAS, OPCIONES_ANTES, crearIcs, eventoDeTarea, guardarConfig, leerConfigs, normalizarAntes, primerDiario, textoAntes, type ConfigAvisoTarea } from '../lib/avisosTarea'
import { textoVence } from '../lib/urgencia'
import { useAviso } from '../ui/Aviso'

/** "Configurar avisos" de una tarea: tú eliges cuántos avisos y cuánto antes; salen a pantalla completa y se pueden llevar a Google Calendar. */
export function AvisosTarea({ tarea, curso, alCerrar }: { tarea: Tarea; curso?: Curso; alCerrar: () => void }) {
  const avisar = useAviso()
  const previo = leerConfigs()[tarea.id]
  const [antes, setAntes] = useState<number[]>(previo?.antes ?? [1440, 60])
  const [diario, setDiario] = useState(previo?.diarioA ?? '')
  const [num, setNum] = useState('2')
  const [unidad, setUnidad] = useState(60)
  const [ocupado, setOcupado] = useState(false)

  const config = (): ConfigAvisoTarea => ({ antes: normalizarAntes(antes), diarioA: diario || undefined })
  const alternar = (m: number) => setAntes((a) => (a.includes(m) ? a.filter((x) => x !== m) : [...a, m]))
  const agregarPropio = () => {
    const m = Math.round(Number(num) * unidad)
    if (!Number.isFinite(m) || m < 0) return avisar('Pon un número válido.', 'error')
    if (normalizarAntes([...antes, m]).length > MAX_ALARMAS) return avisar(`Máximo ${MAX_ALARMAS} avisos por tarea. Quita alguno.`, 'error')
    setAntes((a) => [...a, m])
  }
  const lista = [...new Set([...OPCIONES_ANTES, ...antes])].sort((a, b) => a - b)
  const evento = () => eventoDeTarea(tarea, config(), curso?.nombre ?? '', new Date())

  const sinAvisos = () => {
    const c = config()
    if (!c.antes.length && !c.diarioA) {
      avisar('Elige al menos un aviso.', 'error')
      return true
    }
    if (c.antes.length >= MAX_ALARMAS + 1) return true
    return false
  }

  const guardarEnAstia = () => {
    if (sinAvisos()) return
    guardarConfig(tarea.id, config())
    avisar('Listo: Astia te avisará a pantalla completa cuando esté abierta.')
    alCerrar()
  }

  const aGoogle = async () => {
    if (sinAvisos()) return
    setOcupado(true)
    try {
      if (!calendarioConectado() && !(await conectarCalendario(true))) return avisar('No pude conectar con Google Calendar. Inténtalo otra vez.', 'error')
      const e = evento()
      const primero = e.diario ? primerDiario(e.diario.hora, e.diario.hasta, new Date()) : null
      await crearEventoTarea({ ...e, diario: e.diario && primero ? { primero, hasta: e.diario.hasta } : undefined })
      guardarConfig(tarea.id, config())
      avisar('Listo: creado en Google Calendar con tus avisos.', 'ok', { duracion: 5000 })
      alCerrar()
    } catch {
      avisar('Google Calendar no respondió. Prueba con "Archivo para tu calendario".', 'error', { duracion: 6000 })
    } finally {
      setOcupado(false)
    }
  }

  const aArchivo = () => {
    if (sinAvisos()) return
    const ics = crearIcs(tarea.id, evento(), new Date())
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'astia-aviso.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    guardarConfig(tarea.id, config())
    avisar('Ábrelo y elige "Agregar al calendario". Ahí quedan todas tus alarmas.', 'ok', { duracion: 7000 })
  }

  return (
    <div>
      <p className="nota">{tarea.titulo} · {textoVence(tarea, new Date())}</p>
      <div className="campo">
        <span className="etiqueta" id="at-antes">¿Cuándo quieres que te avise? (hasta {MAX_ALARMAS})</span>
        <div className="alarma-horas" role="group" aria-labelledby="at-antes">
          {lista.map((m) => (
            <button key={m} type="button" className={'chip alarma-hora' + (antes.includes(m) ? ' elegido' : '')} aria-pressed={antes.includes(m)} onClick={() => alternar(m)}>
              {antes.includes(m) ? '✓ ' : ''}{textoAntes(m)}
            </button>
          ))}
        </div>
        <div className="preguntar-fila">
          <input className="fz-texto" type="number" min="0" inputMode="numeric" aria-label="Cantidad" value={num} onChange={(e) => setNum(e.target.value)} />
          <select className="fz-texto" aria-label="Unidad" value={unidad} onChange={(e) => setUnidad(Number(e.target.value))}>
            <option value={1}>minutos antes</option>
            <option value={60}>horas antes</option>
            <option value={1440}>días antes</option>
          </select>
          <button type="button" className="btn suave" onClick={agregarPropio}>Agregar</button>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="at-diario">Además, avisarme cada día a las… (hasta la entrega)</label>
        <div className="preguntar-fila">
          <input id="at-diario" className="fz-texto" type="time" value={diario} onChange={(e) => setDiario(e.target.value)} />
          {diario && <button type="button" className="btn suave" onClick={() => setDiario('')}>Quitar</button>}
        </div>
        <p className="nota">El aviso diario va en tu calendario (Google o archivo).</p>
      </div>
      <div className="acciones aviso-tarea-botones">
        {calendarioConfigurado() && <button type="button" className="btn" disabled={ocupado} onClick={() => void aGoogle()}>Crear en Google Calendar</button>}
        <button type="button" className={calendarioConfigurado() ? 'btn suave' : 'btn'} onClick={aArchivo}>Archivo para tu calendario (.ics)</button>
        <button type="button" className="btn suave" onClick={guardarEnAstia}>Solo en Astia (pantalla completa)</button>
      </div>
      {!calendarioConfigurado() && <p className="nota">El archivo se abre en el Calendario de tu teléfono o en Google Calendar y crea todas las alarmas, sin configurar nada más.</p>}
    </div>
  )
}
