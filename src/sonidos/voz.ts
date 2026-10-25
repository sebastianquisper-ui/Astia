// Alpi lee los avisos en voz alta con la voz del iPhone (Web Speech API): gratis y sin servidor.
// Solo habla con la app abierta, y en iOS después de que tocaste la pantalla.

export interface PreferenciasVoz {
  /** Por defecto no: se activa en Más → Sonidos. */
  activa?: boolean
  /** `voiceURI` de la voz elegida; si falta, la primera en español. */
  voz?: string
}

let prefs: PreferenciasVoz = {}
export const configurarVoz = (p: PreferenciasVoz | undefined) => {
  prefs = p ?? {}
}

const motor = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null)
export const vozDisponible = () => motor() !== null

/** Las voces en español del teléfono (Perú no tiene; se ofrecen las demás). */
export function vocesEspanol(): SpeechSynthesisVoice[] {
  const m = motor()
  if (!m) return []
  return m.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
}

function elegirVoz(): SpeechSynthesisVoice | undefined {
  const lista = vocesEspanol()
  return lista.find((v) => v.voiceURI === prefs.voz) ?? lista.find((v) => v.lang.toLowerCase().replace('_', '-') === 'es-pe') ?? lista.find((v) => v.lang.toLowerCase().includes('us') || v.lang.toLowerCase().includes('mx')) ?? lista[0]
}

function decir(texto: string) {
  const m = motor()
  if (!m || !texto.trim()) return
  m.cancel() // el aviso nuevo reemplaza al anterior, sin acumular
  const u = new SpeechSynthesisUtterance(texto)
  const v = elegirVoz()
  if (v) (u.voice = v), (u.lang = v.lang)
  else u.lang = 'es-MX'
  u.rate = 1
  m.speak(u)
}

/** Lee un aviso si la voz está activa. */
export function hablar(texto: string) {
  if (prefs.activa) decir(texto)
}

/** Para el botón "Probar": suena aunque la voz no esté activa. */
export const probarVoz = (texto = 'Hola, soy Alpi. Así te leeré los avisos.') => decir(texto)
