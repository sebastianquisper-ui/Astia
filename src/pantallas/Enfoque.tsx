import { useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { METODOS, fasesDe, type MetodoId } from '../lib/metodos'
import { useSesion } from '../sesion/useSesion'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'

/** Más → Enfoque y descanso: la biblioteca de métodos de estudio para usar sueltos. */
export function Enfoque({ alVolver }: { alVolver: () => void }) {
  const { perfil, guardarPerfil } = useDatos()
  const avisar = useAviso()
  const { iniciar, nodo } = useSesion()
  const [abierto, setAbierto] = useState<MetodoId | null>(null)
  const [enfoque, setEnfoque] = useState(String(perfil.enfoqueMin))
  const [descanso, setDescanso] = useState(String(perfil.descansoMin))
  const cfg = { enfoqueMin: perfil.enfoqueMin, descansoMin: perfil.descansoMin }

  const guardarTiempos = () => {
    const e = Math.min(90, Math.max(5, parseInt(enfoque, 10) || 25))
    const d = Math.min(30, Math.max(1, parseInt(descanso, 10) || 5))
    setEnfoque(String(e))
    setDescanso(String(d))
    if (e !== perfil.enfoqueMin || d !== perfil.descansoMin) {
      guardarPerfil({ enfoqueMin: e, descansoMin: d })
      avisar('Tiempos del Pomodoro guardados.')
    }
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Enfoque y descanso</h1>
      <p className="sub">Elige cómo estudiar. Astia sugiere un método para cada tarea, pero aquí puedes usar cualquiera.</p>

      <div className="tarjeta tarjeta-arranque">
        <p className="grande">Solo 10 minutos para arrancar</p>
        <p className="sub" style={{ marginTop: 4 }}>Cuando no tienes ganas: empieza diez minutos y después decides si sigues.</p>
        <div className="acciones">
          <button className="btn" onClick={() => iniciar('arranque')}>Empezar 10 minutos</button>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Tu Pomodoro</h2>
        <div className="dos">
          <div className="campo">
            <label htmlFor="en-enfoque">Enfoque (min)</label>
            <input id="en-enfoque" type="number" inputMode="numeric" min={5} max={90} value={enfoque} onChange={(e) => setEnfoque(e.target.value)} onBlur={guardarTiempos} />
          </div>
          <div className="campo">
            <label htmlFor="en-descanso">Descanso (min)</label>
            <input id="en-descanso" type="number" inputMode="numeric" min={1} max={30} value={descanso} onChange={(e) => setDescanso(e.target.value)} onBlur={guardarTiempos} />
          </div>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Métodos de estudio</h2>
        <div className="tlista">
          {METODOS.map((m) => {
            const fases = fasesDe(m.id, cfg)
            const minutos = fases.reduce((a, f) => a + f.minutos, 0)
            const abierta = abierto === m.id
            return (
              <div key={m.id} className={'metodo-card' + (abierta ? ' abierta' : '')}>
                <button className="metodo-cab" aria-expanded={abierta} onClick={() => setAbierto(abierta ? null : m.id)}>
                  <span className="metodo-info">
                    <b>{m.nombre}</b>
                    <span>{m.paraQue}</span>
                  </span>
                  <span className="metodo-min">{minutos} min</span>
                </button>
                {abierta && (
                  <div className="metodo-detalle">
                    <p>{m.porque}</p>
                    <ol className="metodo-fases">
                      {fases.map((f, i) => (
                        <li key={i} className={f.tipo}>
                          <b>{f.etiqueta}</b> <small>{f.minutos} min</small>
                          <span>{f.descripcion}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="acciones">
                      <button className="btn" onClick={() => iniciar(m.id)} aria-label={'Empezar ' + m.nombre}>Empezar {m.nombre}</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {nodo}
    </section>
  )
}
