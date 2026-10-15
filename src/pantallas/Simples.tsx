import { Vacio } from '../ui/Vacio'

// Pantallas que se llenan con datos reales en la fase 3. Por ahora muestran su
// estado vacío, que también es el que verá un usuario nuevo.

export function Semana() {
  return (
    <section className="pantalla">
      <h1 className="titulo">Semana</h1>
      <p className="sub">Lunes a domingo, con clases y tareas juntas.</p>
      <div className="seccion">
        <Vacio titulo="Semana libre" texto="Tus clases y entregas de la semana aparecerán aquí." />
      </div>
    </section>
  )
}

export function Cursos() {
  return (
    <section className="pantalla">
      <h1 className="titulo">Cursos</h1>
      <p className="sub">Cada curso con sus 16 semanas.</p>
      <div className="seccion">
        <Vacio titulo="Sin cursos" texto="Agrega tus cursos para ver el tema de cada semana, tus notas y actividades." />
      </div>
    </section>
  )
}

export function Tareas() {
  return (
    <section className="pantalla">
      <h1 className="titulo">Tareas</h1>
      <p className="sub">Rojo: menos de 48 h · Ámbar: esta semana · Verde: después.</p>
      <div className="seccion">
        <Vacio titulo="Nada pendiente" texto="Cuando agregues tareas las verás aquí ordenadas por urgencia." />
      </div>
    </section>
  )
}
