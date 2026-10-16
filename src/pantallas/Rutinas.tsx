import { useState } from 'react'
import type { Rutina } from '../dominio/tipos'
import { useDatos } from '../datos/DatosProvider'
import { useEjecutorRutina } from '../formularios/EjecutarRutina'
import { FormRutina } from '../formularios/FormRutina'
import { apartadoDe } from '../lib/apartados'
import { MOMENTOS, hechaHoy, textoDias } from '../lib/rutinas'
import { PLANTILLAS_RUTINA } from '../lib/sugerencias'
import { Hoja } from '../ui/Hoja'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'
import { Vacio } from '../ui/Vacio'
import { crearId } from '../datos/almacenamiento'

export function Rutinas({ alVolver }: { alVolver: () => void }) {
  const { rutinas, guardarRutina, borrarRutina } = useDatos()
  const avisar = useAviso()
  const [editando, setEditando] = useState<{ id?: string; plantilla?: number } | null>(null)
  const inicial = editando?.id ? rutinas.find((r) => r.id === editando.id) : undefined
  const hoy = new Date()
  const ejecutor = useEjecutorRutina()

  const tarjeta = (r: Rutina) => {
    const ap = apartadoDe(r.categoria)
    const hecha = hechaHoy(r, hoy)
    return (
      <div key={r.id} className="rutina-card" style={{ ['--color' as string]: ap.color }}>
        <button className="rutina-info" onClick={() => setEditando({ id: r.id })} aria-label={'Editar: ' + r.nombre}>
          <b>{r.nombre}</b>
          <span className="habito-meta">
            <span className="con-icono"><Icono nombre={ap.icono} tam={13} />{ap.nombre}</span>
            <span>{r.pasos.length} {r.pasos.length === 1 ? 'paso' : 'pasos'}</span>
            <span>{textoDias(r.dias)}</span>
          </span>
          {hecha && <span className="etiqueta verde">Hecha hoy</span>}
        </button>
        <button className="btn pequeno" onClick={() => ejecutor.empezar(r.id)} aria-label={(hecha ? 'Repetir: ' : 'Empezar: ') + r.nombre}>{hecha ? 'Repetir' : 'Empezar'}</button>
      </div>
    )
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <div className="seccion-cab">
        <h1 className="titulo">Rutinas</h1>
        <button className="btn pequeno" onClick={() => setEditando({})}>+ Nueva rutina</button>
      </div>
      <p className="sub">Una rutina es una lista de pasos en orden: tu mañana, tu noche o un entrenamiento. Empiézala y ve marcando.</p>

      {rutinas.length === 0 ? (
        <div className="seccion">
          <Vacio titulo="Sin rutinas" texto="Crea una con el botón de arriba, o parte de una plantilla." />
          <div className="campo">
            <span className="etiqueta" id="rut-plantillas">Plantillas</span>
            <div className="ideas" role="group" aria-labelledby="rut-plantillas">
              {PLANTILLAS_RUTINA.map((p, i) => (
                <button key={p.nombre} className="idea" onClick={() => setEditando({ plantilla: i })}>{p.nombre}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        MOMENTOS.map((m) => {
          const delMomento = rutinas.filter((r) => r.momento === m.id)
          return delMomento.length ? (
            <div className="seccion" key={m.id}>
              <h2 className="titulo">{m.texto}</h2>
              <div className="tlista">{delMomento.map(tarjeta)}</div>
            </div>
          ) : null
        })
      )}

      <Hoja titulo={inicial ? 'Editar rutina' : 'Nueva rutina'} abierta={editando !== null} alCerrar={() => setEditando(null)}>
        {editando && (
          <FormRutina
            key={editando.id ?? 'nueva' + (editando.plantilla ?? '')}
            inicial={inicial}
            plantilla={editando.plantilla !== undefined ? PLANTILLAS_RUTINA[editando.plantilla] : undefined}
            alGuardar={(r) => {
              guardarRutina({ ...r, id: r.id || crearId() })
              setEditando(null)
              avisar(inicial ? 'Rutina actualizada.' : `Rutina agregada: ${r.nombre}.`)
            }}
            alBorrar={
              inicial
                ? () => {
                    borrarRutina(inicial.id)
                    setEditando(null)
                    avisar('Rutina borrada.')
                  }
                : undefined
            }
            alCerrar={() => setEditando(null)}
          />
        )}
      </Hoja>
      {ejecutor.nodo}
    </section>
  )
}
