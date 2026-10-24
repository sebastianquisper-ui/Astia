import { useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { FormCurso, COLORES_CURSO } from '../formularios/FormCurso'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'
import { Vacio } from '../ui/Vacio'
import { DetalleCurso } from './DetalleCurso'

export function Cursos() {
  const { cursos, clases, tareas, guardarCurso, borrarCurso } = useDatos()
  const avisar = useAviso()
  const [editando, setEditando] = useState<{ id?: string } | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const inicial = editando?.id ? cursos.find((c) => c.id === editando.id) : undefined
  const cerrar = () => setEditando(null)
  const detalle = abierto ? cursos.find((c) => c.id === abierto) : undefined

  const hoja = (
    <Hoja titulo={inicial ? 'Editar curso' : 'Nuevo curso'} abierta={editando !== null} alCerrar={cerrar}>
      {editando && (
        <FormCurso
          key={editando.id ?? 'nuevo'}
          inicial={inicial}
          colorSugerido={COLORES_CURSO[cursos.length % COLORES_CURSO.length]}
          alGuardar={(c) => {
            guardarCurso(c)
            cerrar()
            avisar(inicial ? 'Curso actualizado.' : `Curso agregado: ${c.nombre}.`)
          }}
          alBorrar={
            inicial
              ? () => {
                  borrarCurso(inicial.id)
                  cerrar()
                  setAbierto(null)
                  avisar('Curso borrado.')
                }
              : undefined
          }
          alCerrar={cerrar}
        />
      )}
    </Hoja>
  )

  if (detalle) {
    return (
      <>
        <DetalleCurso curso={detalle} alVolver={() => setAbierto(null)} alEditar={() => setEditando({ id: detalle.id })} />
        {hoja}
      </>
    )
  }

  return (
    <section className="pantalla">
      <div className="seccion-cab">
        <h1 className="titulo">Cursos</h1>
        <button className="btn pequeno" onClick={() => setEditando({})}>+ Nuevo curso</button>
      </div>
      <p className="sub">Toca un curso para ver sus semanas, el tema de cada una y editarlo.</p>

      <div className="seccion" style={{ marginTop: 14 }}>
        {cursos.length === 0 ? (
          <Vacio titulo="Sin cursos" texto="Agrega tus cursos con el botón de arriba, o importa tu respaldo de la v1 en Más → Ajustes." />
        ) : (
          <div className="lista">
            {cursos.map((c) => {
              const nClases = clases.filter((x) => x.cursoId === c.id).length
              const nPend = tareas.filter((t) => t.cursoId === c.id && t.estado === 'pendiente').length
              return (
                <button key={c.id} className="fila" onClick={() => setAbierto(c.id)}>
                  <i className="punto grande" style={{ background: c.color }} />
                  <span className="texto">
                    <b>{c.nombre}</b>
                    <span>
                      {nClases} {nClases === 1 ? 'clase' : 'clases'} por semana · {nPend} {nPend === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  </span>
                  <Icono nombre="derecha" tam={18} />
                </button>
              )
            })}
          </div>
        )}
      </div>
      {hoja}
    </section>
  )
}
