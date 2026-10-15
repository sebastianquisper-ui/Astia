import { useAjustes } from '../ajustes/AjustesProvider'
import { fraseDelDia, saludoDe } from '../lib/saludo'
import { Vacio } from '../ui/Vacio'
import { useAviso } from '../ui/Aviso'

export function Hoy() {
  const { ajustes } = useAjustes()
  const avisar = useAviso()
  const ahora = new Date()

  return (
    <section className="pantalla">
      <h1 className="saludo">
        {saludoDe(ahora.getHours())}, {ajustes.nombre}.
      </h1>
      <p className="frase">{fraseDelDia(ahora)}</p>

      <div className="tarjeta tarjeta-ahora">
        <p className="sub">Ahora</p>
        <p className="grande">Aquí verás tu clase actual o la siguiente, con cuenta regresiva.</p>
        <div className="acciones">
          <button className="btn" onClick={() => avisar('El temporizador llega en la fase 4.')}>
            Empezar ya
          </button>
          <button className="btn suave" onClick={() => avisar('El dictado llega en la fase 5.')}>
            Dictar
          </button>
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo">Tus 3 de hoy</h2>
        <Vacio titulo="Sin tareas todavía" texto="Cuando cargues tus cursos y tareas, elige aquí las 3 que sí o sí cumples hoy." />
      </div>
    </section>
  )
}
