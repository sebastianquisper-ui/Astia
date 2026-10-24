import { useState } from 'react'
import type { SemanaTema } from '../dominio/tipos'

/** Tema y notas de una semana del ciclo para un curso. Dejar ambos vacíos borra la semana. */
export function FormSemanaTema({ inicial, alGuardar, alCerrar }: { inicial?: SemanaTema; alGuardar: (tema: string, notas: string) => void; alCerrar: () => void }) {
  const [tema, setTema] = useState(inicial?.tema ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        alGuardar(tema.trim(), notas.trim())
      }}
    >
      <div className="campo">
        <label htmlFor="fs-tema">Tema de la semana</label>
        <input id="fs-tema" type="text" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ejemplo: Integrales por partes" autoFocus />
      </div>
      <div className="campo">
        <label htmlFor="fs-notas">Notas</label>
        <textarea id="fs-notas" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Lo que viste, dudas, qué repasar…" />
      </div>
      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
    </form>
  )
}
