import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { ETAPAS, MAX_SEMANAS, MIN_SEMANAS, etapaDe, type Etapa } from '../lib/etapa'
import { Hoja } from './Hoja'

/** La primera vez: pregunta en qué etapa estás para armar tu calendario (semanas del periodo y cuándo empieza). */
export function Bienvenida() {
  const { ajustes, cambiar } = useAjustes()
  const { guardarPerfil, perfil } = useDatos()
  const [etapa, setEtapa] = useState<Etapa>('universidad')
  const [semanas, setSemanas] = useState(String(etapaDe('universidad').semanas))
  const [inicio, setInicio] = useState(perfil.inicioCiclo)
  const info = etapaDe(etapa)
  const abierta = ajustes.etapa === undefined && !ajustes.datosEjemplo

  const elegir = (e: Etapa) => {
    setEtapa(e)
    setSemanas(String(etapaDe(e).semanas))
  }
  const empezar = () => {
    const n = Math.min(MAX_SEMANAS, Math.max(MIN_SEMANAS, parseInt(semanas, 10) || info.semanas))
    cambiar({ etapa })
    guardarPerfil({ semanasCiclo: n, inicioCiclo: inicio })
  }
  // "Después": se queda con Universidad y se puede cambiar en Más → Ajustes
  const despues = () => cambiar({ etapa: 'universidad' })

  return (
    <Hoja titulo="Bienvenido a Astia" abierta={abierta} alCerrar={despues}>
      <p>Cuéntame dónde estudias y armo tu calendario a tu medida.</p>
      <div className="campo">
        <span className="etiqueta" id="bv-etapa">¿En qué etapa estás?</span>
        <div className="etapas" role="group" aria-labelledby="bv-etapa">
          {ETAPAS.map((e) => (
            <button key={e.id} type="button" className="etapa-op" aria-pressed={etapa === e.id} onClick={() => elegir(e.id)}>
              <b>{e.nombre}</b>
            </button>
          ))}
        </div>
        <p className="nota">{info.ayuda}</p>
      </div>
      <div className="campo">
        <label htmlFor="bv-semanas">¿Cuántas semanas dura tu {info.periodo.toLowerCase()}?</label>
        <input id="bv-semanas" type="number" inputMode="numeric" min={MIN_SEMANAS} max={MAX_SEMANAS} value={semanas} onChange={(e) => setSemanas(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="bv-inicio">¿Cuándo empieza? (opcional)</label>
        <input id="bv-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <p className="nota">Con la fecha, Astia sabe en qué semana estás. Puedes cambiarlo todo después en Más → Ajustes.</p>
      </div>
      <div className="acciones">
        <button type="button" className="btn suave" onClick={despues}>Después</button>
        <button type="button" className="btn" onClick={empezar}>Empezar</button>
      </div>
    </Hoja>
  )
}
