import { useCallback, useEffect, useRef, useState } from 'react'

// Dictado por voz con el reconocimiento de voz del navegador. En el iPhone puede no existir dentro de la app
// instalada: entonces no se muestra el botón y queda el micrófono del teclado del iPhone, que siempre funciona.

interface Reconocedor {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
}
type Constructor = new () => Reconocedor

const constructor = (): Constructor | undefined => {
  const w = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const hayDictado = (): boolean => typeof window !== 'undefined' && !!constructor()

/** Qué decirle a la persona según por qué falló el micrófono. */
export function explicarFalloMicrofono(motivo?: string): string {
  switch (motivo) {
    case 'no-speech':
      return 'No te escuché. Toca Hablar y di la frase.'
    case 'audio-capture':
      return 'No encuentro el micrófono del teléfono.'
    case 'network':
      return 'Sin internet no puedo reconocer tu voz. Usa el micrófono del teclado del iPhone.'
    case 'not-allowed':
    case 'service-not-allowed':
      return 'El iPhone no deja usar el reconocimiento de voz aquí (pasa sobre todo en la app instalada). Usa el micrófono del teclado: tócalo abajo a la derecha del teclado y dicta en el cuadro.'
    default:
      return 'No se pudo usar el micrófono. Usa el del teclado del iPhone: tócalo abajo a la derecha del teclado y dicta en el cuadro.'
  }
}
/** Estos fallos no se arreglan volviendo a tocar: el botón Hablar ya no sirve en este teléfono. */
const permanente = (motivo?: string) => motivo === 'not-allowed' || motivo === 'service-not-allowed'

/** `dictar(alTexto)` escucha una frase en español y la entrega. `escuchando` dice si el micrófono está abierto.
 *  `bloqueado` es true si el iPhone no deja usar el reconocimiento de voz: ahí solo sirve el micrófono del teclado. */
export function useDictado() {
  const [escuchando, setEscuchando] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const actual = useRef<Reconocedor | null>(null)
  useEffect(() => () => actual.current?.stop(), [])

  const dictar = useCallback((alTexto: (texto: string) => void, alFallar?: (motivo?: string) => void, lang = 'es-PE') => {
    const C = constructor()
    if (!C) return alFallar?.('no-disponible')
    if (actual.current) {
      actual.current.stop()
      return
    }
    const r = new C()
    r.lang = lang
    r.interimResults = false
    r.continuous = false
    let dijo = false
    r.onresult = (e) => {
      const texto = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim()
      if (texto) {
        dijo = true
        alTexto(texto)
      }
    }
    r.onend = () => {
      actual.current = null
      setEscuchando(false)
    }
    r.onerror = (e) => {
      actual.current = null
      setEscuchando(false)
      const motivo = e?.error
      if (motivo === 'language-not-supported' && lang !== 'es-ES') return dictar(alTexto, alFallar, 'es-ES') // algunos iPhone no traen es-PE
      if (permanente(motivo)) setBloqueado(true)
      if (!dijo) alFallar?.(motivo)
    }
    actual.current = r
    setEscuchando(true)
    try {
      r.start()
    } catch {
      actual.current = null
      setEscuchando(false)
      alFallar?.('no-disponible')
    }
  }, [])

  return { escuchando, dictar, bloqueado }
}
