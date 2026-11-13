import { useState } from 'react'
import { calendarioConectado, calendarioConfigurado, conectarCalendario, crearEventosRecurrentes } from '../calendario/google'
import { guardarRecurrente, horasValidas, icsRecurrente, leerRecurrentes, primeraVez, reglaRepeticion } from '../lib/avisosRecurrentes'
import { horaBonita } from '../lib/alarmas'
import { useAviso } from '../ui/Aviso'

/** "Configurar avisos" de algo que se repite (hábito, rutina, anotar gastos): eliges las horas del día que quieras. */
export function AvisosRecurrentes({ id, titulo, dias, alCerrar }: { id: string; titulo: string; dias: number[] | null; alCerrar?: () => void }) {
  const avisar = useAviso()
  const [horas, setHoras] = useState<string[]>(leerRecurrentes()[id]?.horas ?? [])
  const [nueva, setNueva] = useState('20:00')
  const [ocupado, setOcupado] = useState(false)

  const agregar = () => {
    const h = horasValidas([...horas, nueva])
    if (h.length === horas.length) return avisar('Elige una hora que no esté ya.', 'error')
    setHoras(h)
  }
  const faltan = () => {
    if (horas.length) return false
    avisar('Agrega al menos una hora.', 'error')
    return true
  }
  const terminar = (msg: string, duracion = 4000) => {
    guardarRecurrente(id, { horas })
    avisar(msg, 'ok', { duracion })
    alCerrar?.()
  }

  const aGoogle = async () => {
    if (faltan()) return
    setOcupado(true)
    try {
      if (!calendarioConectado() && !(await conectarCalendario(true))) return avisar('No pude conectar con Google Calendar.', 'error')
      const ahora = new Date()
      await crearEventosRecurrentes(titulo, horas.map((h) => primeraVez(h, ahora)), reglaRepeticion(dias))
      terminar('Listo: creado en Google Calendar.')
    } catch {
      avisar('Google Calendar no respondió. Prueba con el archivo.', 'error', { duracion: 6000 })
    } finally {
      setOcupado(false)
    }
  }

  const aArchivo = () => {
    if (faltan()) return
    const ics = icsRecurrente(id, titulo, horas, dias, new Date())
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'astia-aviso.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    guardarRecurrente(id, { horas })
    avisar('Ábrelo y elige "Agregar al calendario".', 'ok', { duracion: 6000 })
  }

  return (
    <div className="campo">
      <span className="etiqueta" id={'ar-' + id}>¿A qué horas quieres que te avise? Los días que toca, si aún no lo cumpliste.</span>
      <div className="alarma-horas" role="group" aria-labelledby={'ar-' + id}>
        {horas.map((h) => (
          <button key={h} type="button" className="chip alarma-hora" aria-label={`Quitar ${horaBonita(h)}`} onClick={() => setHoras(horas.filter((x) => x !== h))}>
            {horaBonita(h)} ✕
          </button>
        ))}
        {horas.length === 0 && <p className="nota">Sin horas todavía.</p>}
      </div>
      <div className="preguntar-fila">
        <input className="fz-texto" type="time" aria-label="Nueva hora" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button type="button" className="btn suave" onClick={agregar}>Agregar hora</button>
      </div>
      <div className="acciones aviso-tarea-botones">
        {calendarioConfigurado() && <button type="button" className="btn" disabled={ocupado} onClick={() => void aGoogle()}>Crear en Google Calendar</button>}
        <button type="button" className={calendarioConfigurado() ? 'btn suave' : 'btn'} onClick={aArchivo}>Archivo para tu calendario (.ics)</button>
        <button type="button" className="btn suave" onClick={() => !faltan() && terminar('Listo: Astia te avisará a pantalla completa cuando esté abierta.', 5000)}>Solo en Astia (pantalla completa)</button>
      </div>
      {horas.length > 0 && leerRecurrentes()[id] && <button type="button" className="btn suave" onClick={() => { guardarRecurrente(id, null); setHoras([]); avisar('Avisos quitados.') }}>Quitar todos los avisos</button>}
    </div>
  )
}
