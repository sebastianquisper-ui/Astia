import { EVENTOS, PROPIO, SILENCIO, type EventoSonido, type PreferenciasSonido, eventoPorId } from './catalogo'
import { leerSonido } from './archivos'
import { tocarPreset } from './sintetizador'

// Quien necesite sonar solo llama a `sonar('tareaHecha')`: aquí se decide si suena, cuál y cómo.

let preferencias: PreferenciasSonido = {}
const urls = new Map<EventoSonido, string>()
const reproduciendo = new Set<HTMLAudioElement>()

/** Los ajustes avisan aquí cada vez que cambian los sonidos. */
export function configurarSonidos(p: PreferenciasSonido | undefined): void {
  preferencias = p ?? {}
  for (const [e, url] of urls) if (!preferencias.propios?.[e]) {
    URL.revokeObjectURL(url)
    urls.delete(e)
  }
}

/** Después de subir, quitar o cambiar un archivo propio, se descarta el que estaba listo. */
export function olvidarPropio(evento: EventoSonido): void {
  const u = urls.get(evento)
  if (u) URL.revokeObjectURL(u)
  urls.delete(evento)
}

/** Qué sonido corresponde a este momento: el que elegiste o, si no elegiste, el predeterminado. */
export function elegidoPara(evento: EventoSonido, p: PreferenciasSonido = preferencias): string {
  return p.eventos?.[evento] ?? eventoPorId(evento)?.predeterminado ?? SILENCIO
}

async function tocarPropio(evento: EventoSonido): Promise<boolean> {
  let url = urls.get(evento)
  if (!url) {
    const blob = await leerSonido(evento)
    if (!blob) return false
    url = URL.createObjectURL(blob)
    urls.set(evento, url)
  }
  const a = new Audio(url)
  reproduciendo.add(a)
  a.onended = a.onerror = () => reproduciendo.delete(a)
  try {
    await a.play()
    return true
  } catch {
    reproduciendo.delete(a)
    return false // el navegador no dejó sonar (no hubo un toque antes)
  }
}

/** Toca el sonido de un momento. Devuelve cuánto dura (ms) para quien necesite esperar; 0 si no suena. */
export async function sonar(evento: EventoSonido, p: PreferenciasSonido = preferencias): Promise<number> {
  if (p.activo === false) return 0
  const eleccion = elegidoPara(evento, p)
  if (eleccion === SILENCIO) return 0
  if (eleccion === PROPIO) {
    if (await tocarPropio(evento)) return 1
    return tocarPreset(eventoPorId(evento)?.predeterminado ?? '') // si el archivo no está, suena el predeterminado
  }
  return tocarPreset(eleccion)
}

/** Para escuchar un sonido sin importar los ajustes (la pantalla de Sonidos). */
export async function probar(eleccion: string, evento?: EventoSonido): Promise<void> {
  if (eleccion === SILENCIO) return
  if (eleccion === PROPIO && evento) {
    await tocarPropio(evento)
    return
  }
  tocarPreset(eleccion)
}

/** Para los que esperan que algo termine de sonar (por ejemplo, en pruebas). */
export const sonandoPropios = (): number => reproduciendo.size

export { EVENTOS }
