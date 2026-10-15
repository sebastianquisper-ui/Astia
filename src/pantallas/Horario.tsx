import { useState } from 'react'
import { crearId } from '../datos/almacenamiento'
import { useDatos } from '../datos/DatosProvider'
import { FormClase, type CamposClase } from '../formularios/FormClase'
import { DIAS, aMinutos } from '../lib/fechas'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'

export function Horario({ alVolver }: { alVolver: () => void }) {
  const { cursos, clases, guardarClase, borrarClase } = useDatos()
  const avisar = useAviso()
  const [editando, setEditando] = useState<{ id?: string } | null>(null)
  const inicial = editando?.id ? clases.find((c) => c.id === editando.id) : undefined
  const cerrar = () => setEditando(null)

  const nueva = () => {
    if (!cursos.length) return avisar('Primero agrega un curso (pestaña Cursos).', 'error')
    setEditando({})
  }

  const guardar = (f: CamposClase) => {
    // Editar: la clase conserva su id en su mismo día; los demás días son clases nuevas
    if (inicial && !f.dias.includes(inicial.dia)) borrarClase(inicial.id)
    for (const dia of f.dias) {
      const id = inicial && inicial.dia === dia ? inicial.id : crearId()
      guardarClase({ id, cursoId: f.cursoId, dia, inicio: f.inicio, fin: f.fin, aula: f.aula, actualizadoEn: 0 })
    }
    cerrar()
    avisar(inicial ? 'Clase actualizada.' : f.dias.length > 1 ? `${f.dias.length} clases agregadas.` : 'Clase agregada.')
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <div className="seccion-cab">
        <h1 className="titulo">Horario de clases</h1>
        <button className="btn pequeno" onClick={nueva}>+ Nueva clase</button>
      </div>

      {DIAS.map((nombre, dia) => {
        const delDia = clases.filter((c) => c.dia === dia).sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio))
        return (
          <div className="dia-bloque" key={nombre}>
            <h2 className="dia-titulo">{nombre}</h2>
            {delDia.length === 0 ? (
              <p className="libre">Libre</p>
            ) : (
              delDia.map((c) => {
                const curso = cursos.find((x) => x.id === c.cursoId)
                return (
                  <button key={c.id} className="clase" onClick={() => setEditando({ id: c.id })}>
                    <i className="barra" style={{ background: curso?.color ?? 'var(--muted)' }} />
                    <span className="hora">{c.inicio} – {c.fin}</span>
                    <span className="nombre">
                      {curso?.nombre ?? 'Curso borrado'}
                      {c.aula && <small>{c.aula}</small>}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )
      })}

      <Hoja titulo={inicial ? 'Editar clase' : 'Nueva clase'} abierta={editando !== null} alCerrar={cerrar}>
        {editando && (
          <FormClase
            key={editando.id ?? 'nueva'}
            inicial={inicial}
            cursos={cursos}
            alGuardar={guardar}
            alBorrar={
              inicial
                ? () => {
                    borrarClase(inicial.id)
                    cerrar()
                    avisar('Clase borrada.')
                  }
                : undefined
            }
            alCerrar={cerrar}
          />
        )}
      </Hoja>
    </section>
  )
}
