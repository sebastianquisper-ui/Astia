import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { borrarEventoRecordatorio, calendarioConectado, calendarioConfigurado, conectarCalendario, crearEventoRecordatorio } from '../calendario/google'
import { crearId } from '../datos/almacenamiento'
import { useDatos } from '../datos/DatosProvider'
import type { Apunte, Recordatorio } from '../dominio/tipos'
import { explicarFalloMicrofono, hayDictado, useDictado } from '../lib/dictado'
import { fechaCorta, parseYmd, ymd } from '../lib/fechas'
import { cuandoTexto, interpretarRecordatorio } from '../lib/recordatorios'
import { useAviso } from '../ui/Aviso'
import { Icono } from '../ui/Icono'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

/** Más → Recordatorios y apuntes: "en 10 minutos comprar pan" (con voz de Alpi) y un lugar para guardar eventos y lo que va pasando. */
export function Agenda({ alVolver }: { alVolver: () => void }) {
  const { recordatorios, apuntes, guardarRecordatorio, borrarRecordatorio, guardarApunte, borrarApunte } = useDatos()
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const ahora = useAhora()
  const { escuchando, dictar, bloqueado } = useDictado()
  const [frase, setFrase] = useState('')
  const [creando, setCreando] = useState(false)

  const conCalendario = calendarioConfigurado() && ajustes.calendario?.activo === true

  const recordar = async (texto: string, desdeToque: boolean) => {
    const r = interpretarRecordatorio(texto, new Date())
    if (!r.texto) return avisar('Dime qué quieres recordar. Por ejemplo: "en 10 minutos comprar pan".', 'error')
    if (!r.cuando) return avisar('No entendí cuándo. Di por ejemplo "en 10 minutos", "a las 5 de la tarde" o "mañana a las 8".', 'error', { duracion: 6000 })
    const nuevo: Recordatorio = { id: crearId(), texto: r.texto, cuando: r.cuando.toISOString(), actualizadoEn: 0 }
    setCreando(true)
    guardarRecordatorio(nuevo)
    setFrase('')
    let enCalendario = false
    if (conCalendario) {
      try {
        if (calendarioConectado() || (await conectarCalendario(desdeToque))) {
          const idEvento = await crearEventoRecordatorio({ id: nuevo.id, texto: nuevo.texto, cuando: r.cuando })
          guardarRecordatorio({ ...nuevo, calendarioId: idEvento })
          enCalendario = true
        }
      } catch {
        /* se avisa abajo */
      }
    }
    setCreando(false)
    const cuando = cuandoTexto(r.cuando, new Date())
    if (conCalendario && !enCalendario) avisar(`Listo: te aviso ${cuando}. No pude ponerlo en Google Calendar: si cierras Astia no sonará.`, 'ok', { duracion: 7000 })
    else avisar(`Listo: te aviso ${cuando}${enCalendario ? ' (y en Google Calendar)' : ''}.`, 'ok', { duracion: 4000 })
  }

  const hablar = () =>
    dictar(
      (t) => {
        setFrase(t)
        void recordar(t, false)
      },
      (motivo) => avisar(explicarFalloMicrofono(motivo), 'error', { duracion: 7000 }),
    )

  const quitarRecordatorio = async (r: Recordatorio) => {
    borrarRecordatorio(r.id)
    if (r.calendarioId) void borrarEventoRecordatorio(r.calendarioId)
    avisar('Recordatorio borrado.', 'ok', { accion: 'Deshacer', alAccion: () => guardarRecordatorio({ ...r, calendarioId: undefined }) })
  }

  const pendientes = recordatorios.filter((r) => !r.avisado).sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando))
  const pasados = recordatorios.filter((r) => r.avisado).sort((a, b) => Date.parse(b.cuando) - Date.parse(a.cuando)).slice(0, 3)

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Recordatorios y apuntes</h1>

      <div className="seccion">
        <h2 className="titulo">Recordarme algo</h2>
        <p className="sub">Dime qué y cuándo: "en 10 minutos comprar pan". Cuando llegue la hora suena y Alpi te lo dice en voz alta (con Astia abierta).</p>
        {hayDictado() && !bloqueado && (
          <button className={'btn fz-mic' + (escuchando ? ' escuchando' : '')} onClick={hablar} aria-pressed={escuchando}>
            <Icono nombre="mic" tam={20} /> {escuchando ? 'Escuchando… toca para parar' : 'Hablar'}
          </button>
        )}
        <form
          className="preguntar-fila"
          onSubmit={(e) => {
            e.preventDefault()
            void recordar(frase, true)
          }}
        >
          <input className="fz-texto" type="text" aria-label="Qué quieres recordar" placeholder='Ej.: "en 10 minutos comprar pan"' value={frase} onChange={(e) => setFrase(e.target.value)} />
          <button type="submit" className="btn" disabled={creando}>Recordar</button>
        </form>
        {(bloqueado || !hayDictado()) && <p className="nota preguntar-aviso">Para dictar usa el <b>micrófono del teclado</b> (abajo a la derecha) y toca Recordar.</p>}

        {calendarioConfigurado() ? (
          <div className="campo">
            <span className="etiqueta" id="ag-cal">También en Google Calendar</span>
            <div className="seg" role="group" aria-labelledby="ag-cal">
              <button aria-pressed={conCalendario} onClick={() => cambiar({ calendario: { activo: true } })}>Sí</button>
              <button aria-pressed={!conCalendario} onClick={() => cambiar({ calendario: { activo: false } })}>No</button>
            </div>
            <p className="nota">Así te avisa aunque cierres Astia, con texto y sonido. El evento se borra de tu calendario solo cuando pasa.</p>
          </div>
        ) : (
          <p className="nota">Los avisos suenan con Astia abierta. Para que también lleguen con la app cerrada hay que conectar Google Calendar (pendiente de configurar).</p>
        )}

        {pendientes.length === 0 && pasados.length === 0 ? (
          <Vacio titulo="Sin recordatorios" texto="Los que crees aparecerán aquí hasta que suenen." />
        ) : (
          <div className="lista">
            {pendientes.map((r) => (
              <div key={r.id} className="fila">
                <span className="ico"><Icono nombre="reloj" tam={22} /></span>
                <span className="texto">
                  <b>{r.texto}</b>
                  <span>{cuandoTexto(new Date(r.cuando), ahora)}{r.calendarioId ? ' · en Calendar' : ''}</span>
                </span>
                <button className="btn suave pequeno" aria-label={`Borrar el recordatorio ${r.texto}`} onClick={() => void quitarRecordatorio(r)}>Borrar</button>
              </div>
            ))}
            {pasados.map((r) => (
              <div key={r.id} className="fila fila-pasada">
                <span className="ico"><Icono nombre="reloj" tam={22} /></span>
                <span className="texto">
                  <b>{r.texto}</b>
                  <span>Ya avisé · {cuandoTexto(new Date(r.cuando), ahora)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Apuntes apuntes={apuntes} guardar={guardarApunte} borrar={borrarApunte} />
    </section>
  )
}

function Apuntes({ apuntes, guardar, borrar }: { apuntes: Apunte[]; guardar: (a: Apunte) => void; borrar: (id: string) => void }) {
  const avisar = useAviso()
  const hoy = ymd(new Date())
  const [tipo, setTipo] = useState<'evento' | 'apunte'>('apunte')
  const [texto, setTexto] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [hora, setHora] = useState('')

  const agregar = (e: React.FormEvent) => {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return avisar(tipo === 'evento' ? 'Escribe qué evento es.' : 'Escribe qué quieres apuntar.', 'error')
    if (!fecha) return avisar('Elige la fecha.', 'error')
    guardar({ id: crearId(), texto: limpio, fecha, ...(hora ? { hora } : {}), tipo, actualizadoEn: 0 })
    setTexto('')
    setHora('')
    avisar(tipo === 'evento' ? 'Evento guardado.' : 'Apunte guardado.')
  }

  const quitar = (a: Apunte) => {
    borrar(a.id)
    avisar('Borrado.', 'ok', { accion: 'Deshacer', alAccion: () => guardar(a) })
  }

  const proximos = apuntes.filter((a) => a.tipo === 'evento' && a.fecha >= hoy).sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? '')))
  const recientes = apuntes.filter((a) => !(a.tipo === 'evento' && a.fecha >= hoy)).sort((a, b) => (b.fecha + (b.hora ?? '')).localeCompare(a.fecha + (a.hora ?? '')))
  const fila = (a: Apunte) => (
    <div key={a.id} className="fila">
      <span className="ico"><Icono nombre={a.tipo === 'evento' ? 'calendario' : 'mejora'} tam={22} /></span>
      <span className="texto">
        <b>{a.texto}</b>
        <span>{fechaCorta(parseYmd(a.fecha))}{a.hora ? ' · ' + a.hora : ''}{a.tipo === 'evento' ? ' · evento' : ''}</span>
      </span>
      <button className="btn suave pequeno" aria-label={`Borrar: ${a.texto}`} onClick={() => quitar(a)}>Borrar</button>
    </div>
  )

  return (
    <div className="seccion">
      <h2 className="titulo">Eventos y apuntes</h2>
      <p className="sub">Guarda lo que viene (un cumpleaños, una reunión) o anota lo que va pasando en tu día.</p>
      <form className="preguntar" onSubmit={agregar}>
        <div className="seg" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={tipo === 'apunte'} onClick={() => setTipo('apunte')}>Apunte</button>
          <button type="button" aria-pressed={tipo === 'evento'} onClick={() => setTipo('evento')}>Evento</button>
        </div>
        <textarea className="fz-texto" rows={2} aria-label={tipo === 'evento' ? 'Qué evento es' : 'Qué quieres apuntar'} placeholder={tipo === 'evento' ? 'Ej.: Cumpleaños de mi mamá' : 'Ej.: Hoy conseguí la beca'} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="preguntar-fila">
          <input className="fz-texto" type="date" aria-label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <input className="fz-texto" type="time" aria-label="Hora (opcional)" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
        <button type="submit" className="btn">Guardar</button>
      </form>

      {proximos.length > 0 && (
        <>
          <h3 className="titulo" style={{ marginTop: 14 }}>Próximos eventos</h3>
          <div className="lista">{proximos.map(fila)}</div>
        </>
      )}
      {recientes.length > 0 ? (
        <>
          <h3 className="titulo" style={{ marginTop: 14 }}>Apuntes</h3>
          <div className="lista">{recientes.slice(0, 30).map(fila)}</div>
        </>
      ) : (
        proximos.length === 0 && <Vacio titulo="Nada guardado" texto="Tus eventos y apuntes aparecerán aquí." />
      )}
    </div>
  )
}
