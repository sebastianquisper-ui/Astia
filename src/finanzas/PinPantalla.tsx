import { useEffect, useRef, useState } from 'react'
import { useCuenta } from '../cuenta/CuentaProvider'
import { Icono } from '../ui/Icono'
import { Billete } from './FondoDinero'
import { useBloqueo } from './Bloqueo'
import {
  PIN_MAX,
  PIN_MIN,
  anotarFallo,
  borrarRegistroPin,
  crearRegistroPin,
  guardarRegistroPin,
  leerIntentos,
  leerRegistroPin,
  limpiarIntentos,
  pinValido,
  verificarPin,
  type RegistroPin,
} from './pin'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** El teclado del PIN: puntos arriba, números abajo. */
function Teclado({ valor, alCambiar, alTerminar, deshabilitado }: { valor: string; alCambiar: (v: string) => void; alTerminar: () => void; deshabilitado?: boolean }) {
  const poner = (t: string) => valor.length < PIN_MAX && alCambiar(valor + t)
  return (
    <div className="pin-teclado">
      <div className="pin-puntos" role="img" aria-label={`${valor.length} números escritos`}>
        {Array.from({ length: PIN_MAX }, (_, i) => (
          <i key={i} className={i < valor.length ? 'lleno' : i < PIN_MIN ? 'obligatorio' : ''} />
        ))}
      </div>
      <div className="pin-teclas" role="group" aria-label="Teclado numérico">
        {TECLAS.map((t) => (
          <button key={t} type="button" onClick={() => poner(t)} disabled={deshabilitado}>{t}</button>
        ))}
        <button type="button" className="aux" onClick={() => alCambiar(valor.slice(0, -1))} disabled={deshabilitado || !valor} aria-label="Borrar el último número">⌫</button>
        <button type="button" onClick={() => poner('0')} disabled={deshabilitado}>0</button>
        <button type="button" className="ok" onClick={alTerminar} disabled={deshabilitado || valor.length < PIN_MIN} aria-label="Confirmar PIN">
          <Icono nombre="check" />
        </button>
      </div>
    </div>
  )
}

/** Entrar a Finanstia: crea tu PIN la primera vez y lo pide las siguientes. */
export function PinPantalla() {
  const { usuario, confirmarIdentidad } = useCuenta()
  const { abrir } = useBloqueo()
  const uid = usuario?.uid ?? 'local'
  const [registro, setRegistro] = useState<RegistroPin | null>(() => leerRegistroPin(uid))
  const [valor, setValor] = useState('')
  const [primero, setPrimero] = useState<string | null>(null) // al crear: el PIN escrito la primera vez
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [hasta, setHasta] = useState(() => leerIntentos(uid).hasta)
  const [ahora, setAhora] = useState(() => Date.now())
  const [ocupado, setOcupado] = useState(false)
  const escribiendo = useRef(false)

  // Cuenta regresiva cuando hay que esperar tras muchos errores
  useEffect(() => {
    if (hasta <= Date.now()) return
    const id = window.setInterval(() => setAhora(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [hasta])
  const espera = Math.max(0, Math.ceil((hasta - ahora) / 1000))

  const creando = registro === null

  const terminar = async () => {
    if (escribiendo.current || !pinValido(valor)) return
    escribiendo.current = true
    setOcupado(true)
    try {
      if (creando) {
        if (primero === null) {
          setPrimero(valor)
          setValor('')
          setMensaje('Escríbelo otra vez para confirmar.')
        } else if (primero !== valor) {
          setPrimero(null)
          setValor('')
          setMensaje('No coinciden. Elige tu PIN otra vez.')
        } else {
          guardarRegistroPin(uid, await crearRegistroPin(valor))
          abrir()
        }
      } else if (await verificarPin(valor, registro)) {
        limpiarIntentos(uid)
        abrir()
      } else {
        const e = anotarFallo(uid)
        setHasta(e.hasta)
        setAhora(Date.now())
        setValor('')
        setMensaje(e.hasta > Date.now() ? 'Demasiados intentos. Espera un momento.' : 'PIN incorrecto.')
      }
    } finally {
      escribiendo.current = false
      setOcupado(false)
    }
  }

  const olvide = async () => {
    setMensaje(null)
    if (await confirmarIdentidad()) {
      borrarRegistroPin(uid)
      setHasta(0)
      setRegistro(null)
      setValor('')
      setPrimero(null)
      setMensaje('Listo. Elige un PIN nuevo.')
    } else {
      setMensaje('No se pudo confirmar tu cuenta de Google.')
    }
  }

  return (
    <section className="pantalla pin">
      <div className="pin-billetes" aria-hidden="true">
        <Billete color="#7d5bb0" valor="50" className="b1" />
        <Billete color="#3b78b8" valor="100" className="b2" />
        <Billete color="#c9902a" valor="200" className="b3" />
      </div>
      <h1 className="titulo">{creando ? (primero === null ? 'Crea tu PIN' : 'Confirma tu PIN') : 'Finanstia'}</h1>
      <p className="sub">
        {creando ? `Tu plata se abre con un PIN de ${PIN_MIN} a ${PIN_MAX} números. Solo se guarda en este teléfono.` : 'Escribe tu PIN para ver tu plata.'}
      </p>
      <Teclado valor={valor} alCambiar={setValor} alTerminar={terminar} deshabilitado={ocupado || espera > 0} />
      <p className={'pin-mensaje' + (mensaje && !mensaje.startsWith('Listo') && !mensaje.startsWith('Escríbelo') ? ' error' : '')} role="status" aria-live="polite">
        {espera > 0 ? `Demasiados intentos. Vuelve a intentar en ${espera} s.` : mensaje}
      </p>
      {!creando && (
        <button type="button" className="enlace" onClick={olvide}>
          Olvidé mi PIN
        </button>
      )}
    </section>
  )
}
