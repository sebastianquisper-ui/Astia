import { useEffect, useRef, useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { borrarSonido, duracionDe, guardarSonido, MAX_SEGUNDOS, validarArchivoSonido } from '../sonidos/archivos'
import { EVENTOS, PROPIO, SILENCIO, type EventoSonido, type PreferenciasSonido } from '../sonidos/catalogo'
import { elegidoPara, olvidarPropio, probar } from '../sonidos/reproductor'
import { PRESETS } from '../sonidos/sintetizador'
import { probarVoz, vocesEspanol, vozDisponible } from '../sonidos/voz'
import { useAviso } from '../ui/Aviso'
import { Icono } from '../ui/Icono'

/** Más → Sonidos: qué suena en cada momento, con sonidos predeterminados para escoger y la opción de subir el tuyo. */
export function Sonidos({ alVolver }: { alVolver: () => void }) {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const prefs: PreferenciasSonido = ajustes.sonidos ?? {}
  const activo = prefs.activo !== false
  const [subiendo, setSubiendo] = useState<EventoSonido | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const eventoDelArchivo = useRef<EventoSonido | null>(null)

  // iOS carga las voces un instante después de abrir la pantalla
  const [voces, setVoces] = useState(vocesEspanol)
  useEffect(() => {
    if (!vozDisponible()) return
    const act = () => setVoces(vocesEspanol())
    window.speechSynthesis.addEventListener('voiceschanged', act)
    act()
    return () => window.speechSynthesis.removeEventListener('voiceschanged', act)
  }, [])
  const voz = prefs.voz ?? {}
  const guardarVoz = (parcial: NonNullable<PreferenciasSonido['voz']>) => cambiar({ sonidos: { ...prefs, voz: { ...voz, ...parcial } } })

  const guardarPrefs = (parcial: PreferenciasSonido) => cambiar({ sonidos: { ...prefs, ...parcial } })
  const elegir = (evento: EventoSonido, valor: string) => guardarPrefs({ eventos: { ...prefs.eventos, [evento]: valor } })

  const alElegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // permite elegir el mismo archivo otra vez
    const evento = eventoDelArchivo.current
    if (!f || !evento) return
    const problema = validarArchivoSonido(f)
    if (problema) return avisar(problema, 'error')
    setSubiendo(evento)
    try {
      const segundos = await duracionDe(f)
      if (segundos === null) return avisar('No pude leer ese audio. Prueba con otro archivo (mp3, m4a o wav).', 'error')
      if (segundos > MAX_SEGUNDOS) return avisar(`Ese audio dura ${Math.round(segundos)} segundos. Usa uno de hasta ${MAX_SEGUNDOS}.`, 'error')
      await guardarSonido(evento, f)
      olvidarPropio(evento)
      cambiar({ sonidos: { ...prefs, eventos: { ...prefs.eventos, [evento]: PROPIO }, propios: { ...prefs.propios, [evento]: { nombre: f.name } } } })
      avisar('Listo: ese sonido ya es tuyo para este momento.')
      void probar(PROPIO, evento)
    } catch {
      avisar('No pude guardar el audio en este teléfono.', 'error')
    } finally {
      setSubiendo(null)
    }
  }

  const quitarPropio = async (evento: EventoSonido) => {
    await borrarSonido(evento)
    olvidarPropio(evento)
    const { [evento]: _quitado, ...resto } = prefs.propios ?? {}
    const eventos = { ...prefs.eventos }
    delete eventos[evento] // vuelve al predeterminado
    cambiar({ sonidos: { ...prefs, eventos, propios: resto } })
    avisar('Quité tu sonido. Vuelve el predeterminado.')
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Sonidos</h1>
      <p className="sub">Elige qué suena en cada momento, o sube tu propio sonido. En el iPhone, el silenciador del lateral también calla a Astia.</p>

      <div className="campo">
        <span className="etiqueta" id="so-activo">Sonidos de Astia</span>
        <div className="seg" role="group" aria-labelledby="so-activo">
          <button aria-pressed={activo} onClick={() => guardarPrefs({ activo: true })}>Sí</button>
          <button aria-pressed={!activo} onClick={() => guardarPrefs({ activo: false })}>No</button>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Alpi lee los avisos</h2>
        {vozDisponible() ? (
          <>
            <div className="campo">
              <span className="etiqueta" id="so-voz">Leer los avisos en voz alta</span>
              <div className="seg" role="group" aria-labelledby="so-voz">
                <button aria-pressed={voz.activa === true} onClick={() => (guardarVoz({ activa: true }), probarVoz())}>Sí</button>
                <button aria-pressed={voz.activa !== true} onClick={() => guardarVoz({ activa: false })}>No</button>
              </div>
            </div>
            {voces.length > 0 && (
              <div className="sonido-controles">
                <select aria-label="Voz de Alpi" value={voz.voz ?? ''} onChange={(e) => guardarVoz({ voz: e.target.value || undefined })}>
                  <option value="">Automática</option>
                  {voces.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                  ))}
                </select>
                <button className="icono-btn" aria-label="Probar la voz" onClick={() => probarVoz()}>
                  <Icono nombre="play" tam={18} />
                </button>
              </div>
            )}
            <p className="nota">Usa la voz de tu iPhone, gratis. Solo habla con Astia abierta. Para una voz más natural, descarga una "mejorada" en Ajustes del iPhone → Accesibilidad → Contenido leído → Voces.</p>
          </>
        ) : (
          <p className="nota">Este navegador no puede leer en voz alta.</p>
        )}
      </div>

      <input ref={archivo} id="archivo-sonido" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" hidden aria-label="Archivo de sonido" onChange={alElegirArchivo} />

      <div className="seccion">
        <h2 className="titulo">Cuándo suena</h2>
        <div className="sonidos-lista">
          {EVENTOS.map((e) => {
            const eleccion = elegidoPara(e.id, prefs)
            const propio = prefs.propios?.[e.id]
            return (
              <div key={e.id} className="sonido-evento">
                <div>
                  <b>{e.nombre}</b>
                  <span className="nota">{e.detalle}</span>
                </div>
                <div className="sonido-controles">
                  <select aria-label={`Sonido: ${e.nombre}`} value={eleccion} disabled={!activo} onChange={(ev) => elegir(e.id, ev.target.value)}>
                    <option value={SILENCIO}>Silencio</option>
                    {PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                        {p.id === e.predeterminado ? ' (predeterminado)' : ''}
                      </option>
                    ))}
                    {propio && <option value={PROPIO}>Mi sonido: {propio.nombre}</option>}
                  </select>
                  <button className="icono-btn" aria-label={`Probar el sonido de ${e.nombre}`} disabled={eleccion === SILENCIO} onClick={() => void probar(eleccion, e.id)}>
                    <Icono nombre="play" tam={18} />
                  </button>
                </div>
                <div className="sonido-propio">
                  <button
                    className="btn suave pequeno"
                    disabled={subiendo !== null}
                    onClick={() => {
                      eventoDelArchivo.current = e.id
                      archivo.current?.click()
                    }}
                  >
                    {subiendo === e.id ? 'Subiendo…' : propio ? 'Cambiar mi sonido' : 'Subir mi sonido'}
                  </button>
                  {propio && (
                    <button className="btn suave pequeno" onClick={() => void quitarPropio(e.id)}>
                      Quitar el mío
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Biblioteca de sonidos</h2>
        <p className="nota">Toca ▶ para escucharlos. Después elígelos arriba para el momento que quieras.</p>
        <div className="lista">
          {PRESETS.map((p) => (
            <button key={p.id} className="fila" aria-label={`Escuchar ${p.nombre}`} onClick={() => void probar(p.id)}>
              <span className="ico"><Icono nombre="play" tam={20} /></span>
              <span className="texto">
                <b>{p.nombre}</b>
                <span>{p.detalle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="nota">Tus sonidos propios se guardan solo en este teléfono (mp3, m4a, wav u ogg, hasta {MAX_SEGUNDOS} segundos y 2.5 MB).</p>
    </section>
  )
}
