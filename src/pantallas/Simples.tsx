import { Vacio } from '../ui/Vacio'

// Pantallas que se llenan con datos reales en la fase 3. Por ahora muestran su
// estado vacío, que también es el que verá un usuario nuevo.

export function SemanaAcademica() {
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
