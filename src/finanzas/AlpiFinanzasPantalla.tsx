import { Icono } from '../ui/Icono'
import { useFinanzas } from './FinanzasProvider'
import { PUNTOS_FINANZAS, UMBRALES_FINANZAS, totalXPFinanzas } from './xp'
import { useAlpiFinanzas } from './useAlpiFinanzas'
import { MascotaMini } from '../mascotas/MascotaVista'

const NOMBRES = ['Alpaca bebé', 'Exploradora', 'Guardiana de los valles', 'Alpaca legendaria']

/** Más → Mi Alpi de Finanstia: su nivel, cuánto falta y cómo se gana experiencia con tu plata. */
export function AlpiFinanzasPantalla({ alVolver }: { alVolver: () => void }) {
  useFinanzas()
  const { xp, total, estado } = useAlpiFinanzas()
  const filas = [
    { id: 'constancia', titulo: 'Constancia', detalle: `Cada día en que anotas algo (+${PUNTOS_FINANZAS.diaRegistrado})`, valor: xp.constancia },
    { id: 'ahorro', titulo: 'Ahorro', detalle: `Cada aporte a una meta (+${PUNTOS_FINANZAS.aporte})`, valor: xp.ahorro },
    { id: 'metas', titulo: 'Metas cumplidas', detalle: `Cada meta que llegas a completar (+${PUNTOS_FINANZAS.metaCumplida})`, valor: xp.metas },
    { id: 'meses', titulo: 'Meses ordenados', detalle: `Mes cerrado ganando más de lo que gastas (+${PUNTOS_FINANZAS.mesEquilibrado}) y sin pasarte de ningún tope (+${PUNTOS_FINANZAS.mesEnPresupuesto})`, valor: xp.meses },
  ]
  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Mi Alpi de Finanstia</h1>
      <p className="sub">Este Alpi es solo de tu plata: sube de nivel con lo que haces con ella. Gastar no da puntos; anotar, ahorrar y cumplir, sí.</p>

      <div className="tarjeta" style={{ textAlign: 'center' }}>
        <MascotaMini mascota="alpi" etapa={estado.nivel} tam={120} />
        <h2 className="titulo" style={{ marginTop: 10 }}>Nivel {estado.nivel} de 4 · {NOMBRES[estado.indice]}</h2>
        <div className="meter" role="progressbar" aria-label="Progreso al siguiente nivel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(estado.progreso * 100)}>
          <i style={{ width: `${estado.progreso * 100}%` }} />
        </div>
        <p className="nota">{estado.xpSiguiente === null ? 'Llegó a su último nivel. Sigue así para mantenerlo contento.' : `${total} de ${estado.xpSiguiente} XP para el siguiente nivel.`}</p>
        <p className="xp-total"><b>{totalXPFinanzas(xp)}</b> XP en total</p>
      </div>

      <div className="seccion">
        <h2 className="titulo">Cómo ganas XP</h2>
        <div className="lista">
          {filas.map((f) => (
            <div key={f.id} className="fila xp-fila">
              <span className="texto">
                <b>{f.titulo}</b>
                <span>{f.detalle}</span>
              </span>
              <span className="xp-valor">{f.valor}</span>
            </div>
          ))}
        </div>
        <p className="nota">Para subir de nivel hacen falta {UMBRALES_FINANZAS.slice(1).join(', ')} XP. Con el dinero en verde, Alpi juega con los billetes; en rojo, se queda pidiendo plata.</p>
      </div>
    </section>
  )
}
