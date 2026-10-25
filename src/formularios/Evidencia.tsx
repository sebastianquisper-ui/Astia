import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { achicarFoto, borrarFoto, guardarFoto } from '../datos/evidencias'
import type { Tarea } from '../dominio/tipos'
import { sonar } from '../sonidos/reproductor'
import { useAviso } from '../ui/Aviso'
import { Hoja } from '../ui/Hoja'

// Antiprocrastinación: una tarea solo se marca hecha con evidencia (una foto del trabajo o el
// enlace de la entrega). Reabrirla descarta la evidencia.

type Cumplir = (tarea: Tarea, opciones?: { alHecha?: () => void; alReabrir?: () => void }) => void

const CumplirContext = createContext<Cumplir | null>(null)

/** Marca hecha una tarea (pidiendo evidencia) o la reabre si ya estaba hecha. */
export function useCumplirTarea(): Cumplir {
  const c = useContext(CumplirContext)
  if (!c) throw new Error('useCumplirTarea se usa dentro de <EvidenciaProvider>')
  return c
}

const esEnlace = (t: string) => /^https?:\/\/\S+\.\S+/.test(t.trim())

export function EvidenciaProvider({ children }: { children: ReactNode }) {
  const { alternar } = useDatos()
  const avisar = useAviso()
  const [pedido, setPedido] = useState<{ tarea: Tarea; alHecha?: () => void } | null>(null)
  const [foto, setFoto] = useState<string | null>(null)
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cumplir = useCallback<Cumplir>(
    (tarea, opciones = {}) => {
      if (tarea.estado === 'hecha') {
        alternar(tarea.id)
        void borrarFoto(tarea.id)
        opciones.alReabrir?.()
        return
      }
      setFoto(null)
      setEnlace('')
      setError('')
      setPedido({ tarea, alHecha: opciones.alHecha })
    },
    [alternar],
  )

  const cerrar = () => setPedido(null)

  const elegirFoto = async (archivo?: File) => {
    if (!archivo) return
    setError('')
    try {
      setFoto(await achicarFoto(archivo))
    } catch {
      setError('No pude leer esa foto. Intenta con otra.')
    }
  }

  const entregar = async () => {
    if (!pedido) return
    const conEnlace = esEnlace(enlace)
    if (!foto && !conEnlace) {
      setError('Sin evidencia no cuenta. Toma una foto o pega el enlace de tu entrega.')
      return
    }
    setGuardando(true)
    let conFoto = false
    if (foto) {
      try {
        await guardarFoto(pedido.tarea.id, foto)
        conFoto = true
      } catch {
        if (!conEnlace) {
          setGuardando(false)
          setError('No pude guardar la foto en este teléfono. Pega el enlace de tu entrega.')
          return
        }
      }
    }
    alternar(pedido.tarea.id, { foto: conFoto, enlace: conEnlace ? enlace.trim() : undefined, fecha: new Date().toISOString() })
    setGuardando(false)
    pedido.alHecha?.()
    void sonar('tareaHecha')
    setPedido(null)
    avisar('Evidencia guardada. Tarea hecha.')
  }

  return (
    <CumplirContext.Provider value={cumplir}>
      {children}
      <Hoja titulo="Entrega tu evidencia" abierta={pedido !== null} alCerrar={cerrar}>
        {pedido && (
          <div className="evidencia">
            <p className="sub">
              Para marcar <b>{pedido.tarea.titulo}</b> como hecha, muéstrame la prueba: una foto de tu trabajo o el enlace de la entrega. Sin evidencia no cuenta.
            </p>
            {foto ? (
              <div className="evidencia-foto">
                <img src={foto} alt="Tu evidencia" />
                <button className="btn suave" onClick={() => setFoto(null)}>Cambiar foto</button>
              </div>
            ) : (
              <div className="evidencia-botones">
                <label className="btn" htmlFor="evidencia-camara">
                  Tomar foto
                  <input id="evidencia-camara" type="file" accept="image/*" capture="environment" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} />
                </label>
                <label className="btn suave" htmlFor="evidencia-galeria">
                  Subir de la galería
                  <input id="evidencia-galeria" type="file" accept="image/*" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} />
                </label>
              </div>
            )}
            <label className="campo" htmlFor="evidencia-enlace">
              <span>O el enlace de la entrega (Classroom, Drive, aula virtual…)</span>
              <input id="evidencia-enlace" type="url" inputMode="url" placeholder="https://" value={enlace} onChange={(e) => setEnlace(e.target.value)} />
            </label>
            {error && <p className="evidencia-error" role="alert">{error}</p>}
            <div className="acciones">
              <button className="btn suave" onClick={cerrar}>Ahora no</button>
              <button className="btn" disabled={guardando || (!foto && !esEnlace(enlace))} onClick={entregar}>
                Marcar hecha con evidencia
              </button>
            </div>
          </div>
        )}
      </Hoja>
    </CumplirContext.Provider>
  )
}
