import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { calendarioConectado, calendarioConfigurado, conectarCalendario, sincronizarAlarmasDiarias } from '../calendario/google'
import { HORAS_SUGERIDAS, OPCIONES_CLASE, horaBonita, horaValida, normalizarHoras, type AjustesAlarmas } from '../lib/alarmas'
import { useAviso } from '../ui/Aviso'

/** Más → Recordatorios y apuntes: tú eliges a qué horas Astia te revisa los pendientes y cuánto antes de cada clase te avisa. */
export function PanelAlarmas() {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const [nueva, setNueva] = useState('12:00')
  const [ocupado, setOcupado] = useState(false)
  const al: AjustesAlarmas = ajustes.alarmas ?? {}
  const horas = normalizarHoras(al.horas)
  const activo = al.activo === true

  const guardar = (parcial: AjustesAlarmas) => cambiar({ alarmas: { ...al, ...parcial } })

  /** Deja las alarmas diarias en Google Calendar (si el usuario lo pidió). */
  const aCalendario = async (lista: string[], desdeToque: boolean) => {
    if (!calendarioConfigurado() || !al.enCalendario) return
    try {
      if (!calendarioConectado() && !(await conectarCalendario(desdeToque))) return avisar('No pude conectar con Google Calendar. Inténtalo otra vez con un toque.', 'error')
      const n = await sincronizarAlarmasDiarias(lista, '📌 Astia: revisa tus pendientes')
      avisar(n ? `Listo: ${n} ${n === 1 ? 'alarma' : 'alarmas'} en Google Calendar, todos los días.` : 'Quité las alarmas de Google Calendar.')
    } catch {
      avisar('Google Calendar no respondió. Tus alarmas dentro de Astia siguen funcionando.', 'error', { duracion: 6000 })
    }
  }

  const activar = () => {
    const lista = horas.length ? horas : HORAS_SUGERIDAS
    guardar({ activo: true, horas: lista, claseMin: al.claseMin ?? 10 })
    avisar('Alarmas activadas. Cambia las horas como quieras.')
  }

  const agregar = () => {
    if (!horaValida(nueva)) return avisar('Elige una hora válida.', 'error')
    if (horas.includes(nueva)) return avisar('Esa hora ya está.', 'error')
    const lista = normalizarHoras([...horas, nueva])
    guardar({ horas: lista })
    void aCalendario(lista, true)
  }

  const quitar = (h: string) => {
    const lista = horas.filter((x) => x !== h)
    guardar({ horas: lista })
    void aCalendario(lista, true)
  }

  const probar = () => window.dispatchEvent(new Event('astia:probar-alarma'))

  return (
    <div className="campo">
      <span className="etiqueta">Alarmas a pantalla completa</span>
      {!activo ? (
        <>
          <button className="btn" onClick={activar}>Activar alarmas</button>
          <p className="nota">Astia tapa toda la pantalla con tus pendientes a las horas que elijas, y antes de cada clase. Así no dependes de abrirla.</p>
        </>
      ) : (
        <>
          <div className="alarma-horas">
            {horas.map((h) => (
              <button key={h} className="chip alarma-hora" aria-label={`Quitar la alarma de las ${horaBonita(h)}`} onClick={() => quitar(h)}>
                {horaBonita(h)} ✕
              </button>
            ))}
            {horas.length === 0 && <p className="nota">Sin horas todavía: agrega una abajo.</p>}
          </div>
          <div className="preguntar-fila">
            <input className="fz-texto" type="time" aria-label="Nueva hora de alarma" value={nueva} onChange={(e) => setNueva(e.target.value)} />
            <button className="btn suave" onClick={agregar}>Agregar hora</button>
          </div>

          <span className="etiqueta alarma-sub" id="al-clase">Aviso antes de cada clase</span>
          <div className="seg" role="group" aria-labelledby="al-clase">
            {OPCIONES_CLASE.map((m) => (
              <button key={m} aria-pressed={(al.claseMin ?? 0) === m} onClick={() => guardar({ claseMin: m })}>
                {m === 0 ? 'No' : `${m} min`}
              </button>
            ))}
          </div>

          <span className="etiqueta alarma-sub" id="al-solo">Si no tengo pendientes</span>
          <div className="seg" role="group" aria-labelledby="al-solo">
            <button aria-pressed={al.soloSiPendientes !== false} onClick={() => guardar({ soloSiPendientes: true })}>No molestar</button>
            <button aria-pressed={al.soloSiPendientes === false} onClick={() => guardar({ soloSiPendientes: false })}>Avisar igual</button>
          </div>

          {calendarioConfigurado() && (
            <>
              <span className="etiqueta alarma-sub" id="al-cal">También en Google Calendar (llega con la app cerrada)</span>
              <div className="seg" role="group" aria-labelledby="al-cal">
                <button
                  aria-pressed={al.enCalendario === true}
                  disabled={ocupado}
                  onClick={async () => {
                    setOcupado(true)
                    guardar({ enCalendario: true })
                    await aCalendario(horas, true)
                    setOcupado(false)
                  }}
                >
                  Sí
                </button>
                <button aria-pressed={al.enCalendario !== true} onClick={() => guardar({ enCalendario: false })}>No</button>
              </div>
            </>
          )}

          <div className="acciones">
            <button className="btn suave" onClick={probar}>Probar pantalla completa</button>
            <button className="btn suave" onClick={() => guardar({ activo: false })}>Apagar</button>
          </div>
          <p className="nota">
            Con Astia abierta (o al abrirla hasta 45 min después de la hora) el aviso tapa la pantalla.
            {calendarioConfigurado() ? '' : ' Para que también llegue con la app cerrada hay que conectar Google Calendar (pendiente de configurar).'}
          </p>
        </>
      )}
    </div>
  )
}
