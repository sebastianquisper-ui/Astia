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
  onerror: (() => void) | null
}
type Constructor = new () => Reconocedor

const constructor = (): Constructor | undefined => {
  const w = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const hayDictado = (): boolean => typeof window !== 'undefined' && !!constructor()

/** `dictar(alTexto)` escucha una frase en español y la entrega. `escuchando` dice si el micrófono está abierto. */
export function useDictado() {
  const [escuchando, setEscuchando] = useState(false)
  const actual = useRef<Reconocedor | null>(null)
  useEffect(() => () => actual.current?.stop(), [])

  const dictar = useCallback((alTexto: (texto: string) => void, alFallar?: () => void) => {
    const C = constructor()
    if (!C) return alFallar?.()
    if (actual.current) {
      actual.current.stop()
      return
    }
    const r = new C()
    r.lang = 'es-PE'
    r.interimResults = false
    r.continuous = false
    r.onresult = (e) => {
      const texto = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim()
      if (texto) alTexto(texto)
    }
    r.onend = () => {
      actual.current = null
      setEscuchando(false)
    }
    r.onerror = () => {
      actual.current = null
      setEscuchando(false)
      alFallar?.()
    }
    actual.current = r
    setEscuchando(true)
    try {
      r.start()
    } catch {
      actual.current = null
      setEscuchando(false)
      alFallar?.()
    }
  }, [])

  return { escuchando, dictar }
}
