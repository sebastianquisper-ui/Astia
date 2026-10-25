import { useState } from 'react'
import { crearId } from '../datos/almacenamiento'
import { useDatos } from '../datos/DatosProvider'
import { DetalleHabito } from '../formularios/DetalleHabito'
import { FormHabito } from '../formularios/FormHabito'
import { cumplido, cumplimientoDeHoy } from '../lib/habitos'
import { apartadoDe } from '../lib/apartados'
import { SUGERENCIAS_HABITOS } from '../lib/sugerencias'
import { FilaHabito, PuntosSemana } from '../ui/FilaHabito'
import { Hoja } from '../ui/Hoja'
import { sonar } from '../sonidos/reproductor'
import { useAviso } from '../ui/Aviso'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

export function Habitos() {
  const { habitos, alternarHabito, guardarHabito, borrarHabito } = useDatos()
  const avisar = useAviso()
  const ahora = useAhora()
  const [editando, setEditando] = useState<{ id?: string } | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const inicial = editando?.id ? habitos.find((h) => h.id === editando.id) : undefined
  const detalle = detalleId ? habitos.find((h) => h.id === detalleId) : undefined
  const { hechos, total } = cumplimientoDeHoy(habitos, ahora)

  // Los que faltan hoy primero
  const ordenados = [...habitos].sort((a, b) => Number(cumplido(a, ahora)) - Number(cumplido(b, ahora)))

  const agregarRapido = (i: number) => {
    const s = SUGERENCIAS_HABITOS[i]
    guardarHabito({ id: crearId(), nombre: s.nombre, categoria: s.categoria, color: apartadoDe(s.categoria).color, frecuencia: s.frecuencia, minimo: s.minimo, registro: [], actualizadoEn: 0 })
    avisar(`Hábito agregado: ${s.nombre}.`)
  }

  return (
    <section className="pantalla">
      <div className="seccion-cab">
        <h1 className="titulo">Hábitos</h1>
        <button className="btn pequeno" onClick={() => setEditando({})}>+ Nuevo hábito</button>
      </div>
      <p className="sub">{habitos.length ? `Hoy llevas ${hechos} de ${total}. Toca el círculo para cumplir y el nombre para ver tu racha.` : 'Un hábito pequeño que cumples todos los días vale más que uno grande que abandonas.'}</p>

      <div className="seccion" style={{ marginTop: 14 }}>
        {habitos.length === 0 ? (
          <>
            <Vacio titulo="Sin hábitos todavía" texto="Crea el primero con el botón de arriba. Uno solo, el más fácil." />
            <div className="campo">
              <span className="etiqueta" id="hab-ideas">O empieza con una de estas</span>
              <div className="ideas" role="group" aria-labelledby="hab-ideas">
                {SUGERENCIAS_HABITOS.map((s, i) => (
                  <button key={s.nombre} className="idea" onClick={() => agregarRapido(i)}>+ {s.nombre}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="tlista">
            {ordenados.map((h) => (
              <div key={h.id} className="habito-card">
                <FilaHabito habito={h} hoy={ahora} alAlternar={() => (cumplido(h, ahora) || void sonar('tareaHecha'), alternarHabito(h.id))} alAbrir={() => setDetalleId(h.id)} />
                <PuntosSemana habito={h} hoy={ahora} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Hoja titulo={detalle?.nombre ?? 'Hábito'} abierta={detalle !== undefined} alCerrar={() => setDetalleId(null)}>
        {detalle && (
          <DetalleHabito
            habito={detalle}
            hoy={ahora}
            alAlternarFecha={(fecha) => alternarHabito(detalle.id, fecha)}
            alEditar={() => {
              setDetalleId(null)
              setEditando({ id: detalle.id })
            }}
          />
        )}
      </Hoja>

      <Hoja titulo={inicial ? 'Editar hábito' : 'Nuevo hábito'} abierta={editando !== null} alCerrar={() => setEditando(null)}>
        {editando && (
          <FormHabito
            key={editando.id ?? 'nuevo'}
            inicial={inicial}
            alGuardar={(h) => {
              guardarHabito(h)
              setEditando(null)
              avisar(inicial ? 'Hábito actualizado.' : `Hábito agregado: ${h.nombre}.`)
            }}
            alBorrar={
              inicial
                ? () => {
                    borrarHabito(inicial.id)
                    setEditando(null)
                    avisar('Hábito borrado.')
                  }
                : undefined
            }
            alCerrar={() => setEditando(null)}
          />
        )}
      </Hoja>
    </section>
  )
}
