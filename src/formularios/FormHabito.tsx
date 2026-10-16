import { useState } from 'react'
import type { Frecuencia, Habito } from '../dominio/tipos'
import { crearId } from '../datos/almacenamiento'
import { APARTADOS, apartadoDe } from '../lib/apartados'
import { DIAS_CORTOS } from '../lib/fechas'
import { SUGERENCIAS_HABITOS } from '../lib/sugerencias'
import { useAviso } from '../ui/Aviso'
import { Icono } from '../ui/Icono'
import { COLORES_CURSO } from './FormCurso'

type TipoFrecuencia = Frecuencia['tipo']

export function FormHabito({ inicial, alGuardar, alBorrar, alCerrar }: { inicial?: Habito; alGuardar: (h: Habito) => void; alBorrar?: () => void; alCerrar: () => void }) {
  const avisar = useAviso()
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [categoria, setCategoria] = useState(apartadoDe(inicial?.categoria ?? 'Salud').nombre)
  const [tipo, setTipo] = useState<TipoFrecuencia>(inicial?.frecuencia.tipo ?? 'diaria')
  const [dias, setDias] = useState<number[]>(inicial?.frecuencia.tipo === 'dias' ? inicial.frecuencia.dias : [0, 2, 4])
  const [veces, setVeces] = useState(inicial?.frecuencia.tipo === 'semanal' ? inicial.frecuencia.veces : 3)
  const [minimo, setMinimo] = useState(inicial?.minimo ?? '')
  const [color, setColor] = useState(inicial?.color ?? apartadoDe('Salud').color)
  const [confirma, setConfirma] = useState(false)
  const apartado = apartadoDe(categoria)

  const elegirApartado = (nombreApartado: string) => {
    setCategoria(nombreApartado)
    setColor(apartadoDe(nombreApartado).color) // el color acompaña al apartado (se puede cambiar después)
  }
  const usarSugerencia = (i: number) => {
    const s = SUGERENCIAS_HABITOS[i]
    setNombre(s.nombre)
    elegirApartado(s.categoria)
    setMinimo(s.minimo)
    setTipo(s.frecuencia.tipo)
    if (s.frecuencia.tipo === 'dias') setDias(s.frecuencia.dias)
    if (s.frecuencia.tipo === 'semanal') setVeces(s.frecuencia.veces)
  }
  const alternarDia = (d: number) => setDias((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()))

  const guardar = () => {
    const limpio = nombre.trim()
    if (!limpio) return avisar('Escribe el nombre del hábito.', 'error')
    if (tipo === 'dias' && dias.length === 0) return avisar('Elige al menos un día.', 'error')
    const frecuencia: Frecuencia = tipo === 'diaria' ? { tipo } : tipo === 'dias' ? { tipo, dias } : { tipo, veces }
    alGuardar({ ...(inicial ?? { id: crearId(), registro: [], actualizadoEn: 0 }), nombre: limpio, categoria, color, frecuencia, minimo: minimo.trim() || undefined })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
    >
      {!inicial && (
        <div className="campo">
          <span className="etiqueta" id="fh-ideas">Ideas para empezar</span>
          <div className="ideas" role="group" aria-labelledby="fh-ideas">
            {SUGERENCIAS_HABITOS.map((s, i) => (
              <button key={s.nombre} type="button" className="idea" onClick={() => usarSugerencia(i)}>{s.nombre}</button>
            ))}
          </div>
        </div>
      )}

      <div className="campo">
        <label htmlFor="fh-nombre">Nombre del hábito</label>
        <input id="fh-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ejemplo: Correr 20 minutos" autoFocus={!!inicial} />
      </div>

      <div className="campo">
        <span className="etiqueta" id="fh-apartado">Apartado</span>
        <div className="apartados" role="group" aria-labelledby="fh-apartado">
          {APARTADOS.map((a) => (
            <button key={a.nombre} type="button" className="apartado-chip" aria-pressed={categoria === a.nombre} onClick={() => elegirApartado(a.nombre)} style={{ ['--color' as string]: a.color }}>
              <Icono nombre={a.icono} tam={16} />
              {a.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta" id="fh-frec">Cada cuánto</span>
        <div className="seg" role="group" aria-labelledby="fh-frec">
          <button type="button" aria-pressed={tipo === 'diaria'} onClick={() => setTipo('diaria')}>Todos los días</button>
          <button type="button" aria-pressed={tipo === 'dias'} onClick={() => setTipo('dias')}>Ciertos días</button>
          <button type="button" aria-pressed={tipo === 'semanal'} onClick={() => setTipo('semanal')}>Por semana</button>
        </div>
      </div>
      {tipo === 'dias' && (
        <div className="campo">
          <span className="etiqueta" id="fh-dias">Días</span>
          <div className="dias" role="group" aria-labelledby="fh-dias">
            {DIAS_CORTOS.map((d, i) => (
              <button key={d} type="button" aria-pressed={dias.includes(i)} onClick={() => alternarDia(i)}>{d}</button>
            ))}
          </div>
        </div>
      )}
      {tipo === 'semanal' && (
        <div className="campo">
          <label htmlFor="fh-veces">Veces por semana</label>
          <select id="fh-veces" value={veces} onChange={(e) => setVeces(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      <div className="campo">
        <label htmlFor="fh-minimo">Versión mínima (para los días sin ganas)</label>
        <input id="fh-minimo" type="text" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="Ejemplo: Solo 5 minutos" />
        <p className="nota">Un día sin ganas, la versión mínima también cuenta. Lo importante es no romper la racha.</p>
      </div>

      <div className="campo">
        <span className="etiqueta" id="fh-color">Color</span>
        <div className="colores" role="group" aria-labelledby="fh-color">
          {COLORES_CURSO.map((c) => (
            <button key={c} type="button" className="color" style={{ background: c }} aria-label={'Color ' + c} aria-pressed={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>

      <div className="tecnica">
        <b>Técnica sugerida: {apartado.tecnica.nombre}</b>
        <span>{apartado.tecnica.porque}</span>
      </div>

      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
      {alBorrar && (
        <div className="acciones">
          <button type="button" className="btn peligro" onClick={() => (confirma ? alBorrar() : setConfirma(true))}>
            {confirma ? 'Toca otra vez para borrar' : 'Borrar hábito'}
          </button>
        </div>
      )}
    </form>
  )
}
