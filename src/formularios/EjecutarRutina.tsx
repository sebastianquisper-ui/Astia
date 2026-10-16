import { useCallback, useEffect, useState } from 'react'
import type { Rutina } from '../dominio/tipos'
import { useDatos } from '../datos/DatosProvider'
import { hechaHoy } from '../lib/rutinas'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'

const DESCANSOS = [30, 60, 90]
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function Ejecutor({ rutina, alTerminar }: { rutina: Rutina; alTerminar: () => void }) {
  const { alternarRutina } = useDatos()
  const avisar = useAviso()
  const [marcados, setMarcados] = useState<number[]>([])
  const [finDescanso, setFinDescanso] = useState<number | null>(null)
  const [ahoraMs, setAhoraMs] = useState(Date.now())
  const yaHecha = hechaHoy(rutina, new Date())
  const esDeporte = rutina.categoria === 'Deporte'
  const faltan = rutina.pasos.length - marcados.length

  // El descanso se calcula con la hora real: sigue exacto aunque la pantalla se apague un momento
  useEffect(() => {
    if (finDescanso === null) return
    const id = window.setInterval(() => {
      const ahora = Date.now()
      setAhoraMs(ahora)
      if (ahora >= finDescanso) {
        setFinDescanso(null)
        avisar('Descanso terminado. A la siguiente serie.')
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [finDescanso, avisar])

  const alternarPaso = (i: number) => setMarcados((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
  const restante = finDescanso === null ? 0 : Math.max(0, Math.ceil((finDescanso - ahoraMs) / 1000))

  const terminar = () => {
    if (faltan > 0) return avisar(`Faltan ${faltan} ${faltan === 1 ? 'paso' : 'pasos'}. Termina la rutina.`, 'error')
    alternarRutina(rutina.id)
    alTerminar()
    avisar('Rutina cumplida. Eso es disciplina.')
  }

  return (
    <div>
      <p className="sub">{marcados.length} de {rutina.pasos.length} {esDeporte ? 'ejercicios' : 'pasos'}</p>
      <div className="meter" aria-hidden="true"><i style={{ width: `${(marcados.length / rutina.pasos.length) * 100}%` }} /></div>

      {yaHecha && <p className="nota">Ya cumpliste esta rutina hoy. Puedes repetirla o quitar el registro de hoy.</p>}

      <div className="pasos-lista">
        {rutina.pasos.map((p, i) => (
          <button key={i} className={'paso' + (marcados.includes(i) ? ' hecho' : '')} aria-pressed={marcados.includes(i)} onClick={() => alternarPaso(i)}>
            <span className={'check' + (marcados.includes(i) ? ' on' : '')}>{marcados.includes(i) && <Icono nombre="check" tam={16} />}</span>
            <span className="paso-texto">
              <b>{p.texto}</b>
              {p.detalle && <small>{p.detalle}</small>}
            </span>
          </button>
        ))}
      </div>

      {esDeporte && (
        <div className="descanso">
          {finDescanso === null ? (
            <>
              <span className="etiqueta">Descanso entre series</span>
              <div className="descanso-botones">
                {DESCANSOS.map((s) => (
                  <button key={s} className="btn suave pequeno" onClick={() => { setAhoraMs(Date.now()); setFinDescanso(Date.now() + s * 1000) }}>{s} s</button>
                ))}
              </div>
            </>
          ) : (
            <>
              <b className="descanso-cuenta" role="timer" aria-label={`Descanso, quedan ${restante} segundos`}>{mmss(restante)}</b>
              <button className="btn suave pequeno" onClick={() => setFinDescanso(null)}>Saltar descanso</button>
            </>
          )}
        </div>
      )}

      <div className="acciones">
        <button className="btn" onClick={terminar}>{faltan > 0 ? `Faltan ${faltan}` : 'Terminar rutina'}</button>
      </div>
      {yaHecha && (
        <div className="acciones">
          <button className="btn suave" onClick={() => { alternarRutina(rutina.id); alTerminar(); avisar('Quitaste el registro de hoy.') }}>Quitar el registro de hoy</button>
        </div>
      )}
    </div>
  )
}

/** Para empezar una rutina desde cualquier pantalla. Uso: const { empezar, nodo } = useEjecutorRutina() */
export function useEjecutorRutina() {
  const { rutinas } = useDatos()
  const [id, setId] = useState<string | null>(null)
  const rutina = id ? rutinas.find((r) => r.id === id) : undefined
  const cerrar = useCallback(() => setId(null), [])
  const nodo = (
    <Hoja titulo={rutina?.nombre ?? 'Rutina'} abierta={rutina !== undefined} alCerrar={cerrar}>
      {rutina && <Ejecutor key={rutina.id} rutina={rutina} alTerminar={cerrar} />}
    </Hoja>
  )
  return { empezar: setId, nodo }
}
