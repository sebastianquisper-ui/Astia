import { useState } from 'react'
import type { Momento, PasoRutina, Rutina } from '../dominio/tipos'
import { crearId } from '../datos/almacenamiento'
import { APARTADOS, apartadoDe } from '../lib/apartados'
import { DIAS_CORTOS } from '../lib/fechas'
import { MOMENTOS } from '../lib/rutinas'
import { useAviso } from '../ui/Aviso'
import { Icono } from '../ui/Icono'

interface PasoEditable {
  clave: number
  texto: string
  detalle: string
}

let claveSiguiente = 1

export function FormRutina({ inicial, plantilla, alGuardar, alBorrar, alCerrar }: { inicial?: Rutina; plantilla?: { nombre: string; categoria: string; momento: Momento; pasos: PasoRutina[] }; alGuardar: (r: Rutina) => void; alBorrar?: () => void; alCerrar: () => void }) {
  const avisar = useAviso()
  const origen = inicial ?? plantilla
  const [nombre, setNombre] = useState(origen?.nombre ?? '')
  const [categoria, setCategoria] = useState(apartadoDe(origen?.categoria ?? 'Salud').nombre)
  const [momento, setMomento] = useState<Momento>(origen?.momento ?? 'manana')
  const [dias, setDias] = useState<number[]>(inicial?.dias ?? [])
  const [pasos, setPasos] = useState<PasoEditable[]>(() => {
    const base = origen?.pasos.length ? origen.pasos : [{ texto: '' }]
    return base.map((p) => ({ clave: claveSiguiente++, texto: p.texto, detalle: p.detalle ?? '' }))
  })
  const [confirma, setConfirma] = useState(false)
  const esDeporte = categoria === 'Deporte'

  const cambiarPaso = (clave: number, campo: 'texto' | 'detalle', valor: string) => setPasos((p) => p.map((x) => (x.clave === clave ? { ...x, [campo]: valor } : x)))
  const quitarPaso = (clave: number) => setPasos((p) => (p.length > 1 ? p.filter((x) => x.clave !== clave) : p))
  const moverPaso = (i: number, delta: number) =>
    setPasos((p) => {
      const j = i + delta
      if (j < 0 || j >= p.length) return p
      const copia = [...p]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  const alternarDia = (d: number) => setDias((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()))

  const guardar = () => {
    const limpio = nombre.trim()
    if (!limpio) return avisar('Escribe el nombre de la rutina.', 'error')
    const validos: PasoRutina[] = pasos
      .map((p) => ({ texto: p.texto.trim(), detalle: p.detalle.trim() }))
      .filter((p) => p.texto)
      .map((p) => (p.detalle ? { texto: p.texto, detalle: p.detalle } : { texto: p.texto }))
    if (!validos.length) return avisar('Agrega al menos un paso.', 'error')
    alGuardar({ ...(inicial ?? { id: crearId(), registro: [], actualizadoEn: 0 }), nombre: limpio, categoria, momento, dias, pasos: validos })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
    >
      <div className="campo">
        <label htmlFor="fr-nombre">Nombre de la rutina</label>
        <input id="fr-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ejemplo: Entrenamiento de piernas" autoFocus={!!inicial} />
      </div>

      <div className="campo">
        <span className="etiqueta" id="fr-apartado">Apartado</span>
        <div className="apartados" role="group" aria-labelledby="fr-apartado">
          {APARTADOS.map((a) => (
            <button key={a.nombre} type="button" className="apartado-chip" aria-pressed={categoria === a.nombre} onClick={() => setCategoria(a.nombre)} style={{ ['--color' as string]: a.color }}>
              <Icono nombre={a.icono} tam={16} />
              {a.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta" id="fr-momento">Momento del día</span>
        <div className="seg" role="group" aria-labelledby="fr-momento">
          {MOMENTOS.map((m) => (
            <button key={m.id} type="button" aria-pressed={momento === m.id} onClick={() => setMomento(m.id)}>{m.texto}</button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta" id="fr-dias">Días (si no eliges ninguno, toca cuando quieras)</span>
        <div className="dias" role="group" aria-labelledby="fr-dias">
          {DIAS_CORTOS.map((d, i) => (
            <button key={d} type="button" aria-pressed={dias.includes(i)} onClick={() => alternarDia(i)}>{d}</button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta" id="fr-pasos">{esDeporte ? 'Ejercicios, en orden' : 'Pasos, en orden'}</span>
        <div className="pasos-editor" role="group" aria-labelledby="fr-pasos">
          {pasos.map((p, i) => (
            <div className="paso-fila" key={p.clave}>
              <span className="paso-num">{i + 1}</span>
              <div className="paso-campos">
                <input type="text" value={p.texto} onChange={(e) => cambiarPaso(p.clave, 'texto', e.target.value)} placeholder={esDeporte ? 'Ejemplo: Press banca' : 'Ejemplo: Estirar'} aria-label={`Paso ${i + 1}`} />
                <input type="text" value={p.detalle} onChange={(e) => cambiarPaso(p.clave, 'detalle', e.target.value)} placeholder={esDeporte ? 'Series × repeticiones (4 × 10)' : 'Detalle (5 min)'} aria-label={`Detalle del paso ${i + 1}`} />
              </div>
              <div className="paso-botones">
                <button type="button" className="icono-btn pequeno" onClick={() => moverPaso(i, -1)} disabled={i === 0} aria-label={`Subir el paso ${i + 1}`}><Icono nombre="subir" tam={16} /></button>
                <button type="button" className="icono-btn pequeno" onClick={() => moverPaso(i, 1)} disabled={i === pasos.length - 1} aria-label={`Bajar el paso ${i + 1}`}><Icono nombre="bajar" tam={16} /></button>
                <button type="button" className="icono-btn pequeno" onClick={() => quitarPaso(p.clave)} disabled={pasos.length === 1} aria-label={`Quitar el paso ${i + 1}`}><Icono nombre="cerrar" tam={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn suave pequeno" style={{ marginTop: 10 }} onClick={() => setPasos((p) => [...p, { clave: claveSiguiente++, texto: '', detalle: '' }])}>
          + Agregar {esDeporte ? 'ejercicio' : 'paso'}
        </button>
      </div>

      <div className="acciones">
        <button type="button" className="btn suave" onClick={alCerrar}>Cancelar</button>
        <button type="submit" className="btn">Guardar</button>
      </div>
      {alBorrar && (
        <div className="acciones">
          <button type="button" className="btn peligro" onClick={() => (confirma ? alBorrar() : setConfirma(true))}>
            {confirma ? 'Toca otra vez para borrar' : 'Borrar rutina'}
          </button>
        </div>
      )}
    </form>
  )
}
