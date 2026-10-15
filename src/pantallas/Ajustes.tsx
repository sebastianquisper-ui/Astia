import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import type { ModoTema, TamanoLetra } from '../lib/tema'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'

const TEMAS: { id: ModoTema; texto: string }[] = [
  { id: 'hora', texto: 'Automático' },
  { id: 'claro', texto: 'Claro' },
  { id: 'oscuro', texto: 'Oscuro' },
]
const LETRAS: { id: TamanoLetra; texto: string }[] = [
  { id: 'normal', texto: 'Normal' },
  { id: 'grande', texto: 'Grande' },
  { id: 'muy-grande', texto: 'Muy grande' },
]

export function Ajustes({ alVolver }: { alVolver: () => void }) {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const [nombre, setNombre] = useState(ajustes.nombre)

  const guardarNombre = () => {
    const limpio = nombre.trim()
    if (!limpio) {
      avisar('El nombre no puede estar vacío.', 'error')
      setNombre(ajustes.nombre)
      return
    }
    if (limpio !== ajustes.nombre) {
      cambiar({ nombre: limpio })
      avisar('Nombre guardado.')
    }
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Ajustes</h1>

      <div className="campo">
        <label htmlFor="nombre">Tu nombre</label>
        <input
          id="nombre"
          type="text"
          value={nombre}
          autoComplete="given-name"
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-tema">Tema</span>
        <div className="seg" role="group" aria-labelledby="et-tema">
          {TEMAS.map((t) => (
            <button key={t.id} aria-pressed={ajustes.modoTema === t.id} onClick={() => cambiar({ modoTema: t.id })}>
              {t.texto}
            </button>
          ))}
        </div>
        <p className="nota">Automático: claro de día (6:30 a 18:30) y oscuro de noche.</p>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-letra">Tamaño de letra</span>
        <div className="seg" role="group" aria-labelledby="et-letra">
          {LETRAS.map((l) => (
            <button key={l.id} aria-pressed={ajustes.tamanoLetra === l.id} onClick={() => cambiar({ tamanoLetra: l.id })}>
              {l.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-demo">Datos de ejemplo</span>
        <div className="seg" role="group" aria-labelledby="et-demo">
          <button aria-pressed={ajustes.datosEjemplo} onClick={() => cambiar({ datosEjemplo: true })}>Mostrar</button>
          <button aria-pressed={!ajustes.datosEjemplo} onClick={() => cambiar({ datosEjemplo: false })}>Ocultar</button>
        </div>
        <p className="nota">Cursos, clases y tareas inventados para ver cómo luce Astia. Tus datos reales llegan con la base de datos.</p>
      </div>
    </section>
  )
}
