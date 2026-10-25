import { decirConVozDeHombre, desbloquearVozDeHombre, detenerVozDeHombre } from './vozHombre'

// Alpi lee los avisos en voz alta con la voz del iPhone (Web Speech API): gratis y sin servidor.
// Solo habla con la app abierta, y en iOS después de que tocaste la pantalla.

export interface PreferenciasVoz {
  /** Por defecto no: se activa en Más → Sonidos. */
  activa?: boolean
  /** `voiceURI` de la voz elegida; si falta, la primera en español. */
  voz?: string
  /** 'hombre' o 'mujer'; si falta, sigue a la mascota elegida. */
  genero?: GeneroVoz
  /** La voz de hombre de la app ya está descargada en este teléfono. */
  vozDeHombreInstalada?: boolean
}

export type GeneroVoz = 'hombre' | 'mujer'

let prefs: PreferenciasVoz = {}
let generoMascota: GeneroVoz = 'mujer'
export const configurarVoz = (p: PreferenciasVoz | undefined, delaMascota: GeneroVoz = 'mujer') => {
  prefs = p ?? {}
  generoMascota = delaMascota
}

/** El navegador no dice el género de una voz: se reconoce por el nombre (iOS y Android las llaman así). */
const NOMBRES_HOMBRE = /\b(jorge|diego|juan|carlos|francisco|pablo|enrique|andr[eé]s|miguel|antonio|male|hombre)\b/i
const NOMBRES_MUJER = /\b(paulina|m[oó]nica|ang[eé]lica|marisol|soledad|francisca|luciana|helena|laura|sabina|female|mujer)\b/i
const generoDe = (v: SpeechSynthesisVoice): GeneroVoz | undefined => (NOMBRES_HOMBRE.test(v.name) ? 'hombre' : NOMBRES_MUJER.test(v.name) ? 'mujer' : undefined)
/** ¿Alguna de estas voces es del género pedido? Safari a veces no entrega las de hombre aunque estén instaladas. */
export const hayVozDelGenero = (voces: SpeechSynthesisVoice[], genero: GeneroVoz) => voces.some((v) => generoDe(v) === genero)
export const generoEfectivo = (): GeneroVoz => prefs.genero ?? generoMascota

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
  const elegida = lista.find((v) => v.voiceURI === prefs.voz)
  if (elegida) return elegida
  const genero = generoEfectivo()
  const delGenero = lista.filter((v) => generoDe(v) === genero)
  const candidatas = delGenero.length > 0 ? delGenero : lista
  return candidatas.find((v) => v.lang.toLowerCase().replace('_', '-') === 'es-pe') ?? candidatas.find((v) => v.lang.toLowerCase().includes('us') || v.lang.toLowerCase().includes('mx')) ?? candidatas[0]
}

/** La voz propia de la app se usa solo si pides voz de hombre, el teléfono no tiene una y ya la descargaste. */
const usarVozDeHombreDeLaApp = () => prefs.vozDeHombreInstalada === true && prefs.voz === undefined && generoEfectivo() === 'hombre' && !hayVozDelGenero(vocesEspanol(), 'hombre')

function decir(texto: string) {
  const m = motor()
  if (!texto.trim()) return
  if (usarVozDeHombreDeLaApp()) {
    m?.cancel()
    decirConVozDeHombre(texto).catch(() => decirConElTelefono(texto))
    return
  }
  decirConElTelefono(texto)
}

function decirConElTelefono(texto: string) {
  const m = motor()
  if (!m) return
  detenerVozDeHombre()
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

/** Los recordatorios se dicen en voz alta salvo que apagues la voz a propósito. */
export function decirRecordatorio(texto: string) {
  if (prefs.activa !== false) decir(texto)
}

/** En iOS la primera frase hay que pedirla con un toque: con un susurro vacío queda desbloqueada para después. */
export function desbloquearVoz() {
  desbloquearVozDeHombre()
  const m = motor()
  if (!m) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    m.speak(u)
  } catch {
    /* sin voz en este navegador */
  }
}
