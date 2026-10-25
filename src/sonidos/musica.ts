// Música de fondo de toda la app. La predeterminada se compone sola con Web Audio (sin archivos, sin internet):
// una melodía pegajosa en pentatónica sobre cuatro acordes, con bajo, bombo suave y platillo. También puedes subir tus pistas.
// El navegador solo deja sonar después de un toque en la pantalla; antes de eso la música queda esperando.

import { contextoAudio, desbloquearAudio } from './sintetizador'

export interface PreferenciasMusica {
  /** Por defecto sí (empieza con tu primer toque). */
  activa?: boolean
  /** De 0 a 1. */
  volumen?: number
  /** 'predeterminada' o el id de una pista tuya. */
  pista?: string
  propias?: { id: string; nombre: string }[]
}

export const PREDETERMINADA = 'predeterminada'
export const VOLUMEN_INICIAL = 0.4
export const MAX_PISTAS = 5
export const MAX_BYTES_MUSICA = 12 * 1024 * 1024
export const MAX_MINUTOS_MUSICA = 10

let prefs: PreferenciasMusica = {}
let maestro: GainNode | null = null
let reloj: number | undefined
let sonando: 'generada' | 'archivo' | null = null
let audioPista: { el: HTMLAudioElement; url: string; fuente: MediaElementAudioSourceNode | null } | null = null
let pistaCargada: string | null = null

const quiere = () => prefs.activa !== false
const volumenDe = () => Math.min(1, Math.max(0, prefs.volumen ?? VOLUMEN_INICIAL))
const pistaElegida = () => (prefs.pista && prefs.pista !== PREDETERMINADA && prefs.propias?.some((p) => p.id === prefs.pista) ? prefs.pista : PREDETERMINADA)

/** ¿Está sonando la música ahora? (para el botón de la cabecera y las pruebas) */
export const musicaSonando = (): boolean => sonando !== null

// ---------- la música que compone la app ----------

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
const BPM = 108
const CORCHEA = 60 / BPM / 2
// Do – Sol – La menor – Fa: bajo y acorde de cada compás
const ACORDES: { bajo: number; notas: number[] }[] = [
  { bajo: 36, notas: [60, 64, 67, 72] },
  { bajo: 43, notas: [59, 62, 67, 71] },
  { bajo: 45, notas: [57, 60, 64, 69] },
  { bajo: 41, notas: [57, 60, 65, 69] },
]
// La melodía (ocho corcheas por compás); 0 = silencio
const MELODIA = [
  [79, 0, 76, 79, 81, 0, 79, 76],
  [78, 0, 74, 78, 79, 0, 76, 74],
  [76, 0, 72, 76, 81, 0, 79, 76],
  [77, 0, 76, 72, 74, 0, 76, 0],
]

function pluck(c: AudioContext, t: number, freq: number, dur: number, pico: number, onda: OscillatorType = 'triangle') {
  const o = c.createOscillator()
  const f = c.createBiquadFilter()
  const g = c.createGain()
  o.type = onda
  o.frequency.value = freq
  f.type = 'lowpass'
  f.frequency.setValueAtTime(freq * 6, t)
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pico, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(f)
  f.connect(g)
  g.connect(maestro!)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function bombo(c: AudioContext, t: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.setValueAtTime(130, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
  o.connect(g)
  g.connect(maestro!)
  o.start(t)
  o.stop(t + 0.25)
}

let ruidoBuf: AudioBuffer | null = null
function platillo(c: AudioContext, t: number) {
  if (!ruidoBuf) {
    ruidoBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.1), c.sampleRate)
    const d = ruidoBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const n = c.createBufferSource()
  const f = c.createBiquadFilter()
  const g = c.createGain()
  n.buffer = ruidoBuf
  f.type = 'highpass'
  f.frequency.value = 7000
  g.gain.setValueAtTime(0.09, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  n.connect(f)
  f.connect(g)
  g.connect(maestro!)
  n.start(t)
}

let siguiente = 0 // instante (del audio) de la próxima corchea
let paso = 0 // corchea contada desde el inicio

function programar(c: AudioContext) {
  while (siguiente < c.currentTime + 0.35) {
    const t = siguiente
    const enCompas = paso % 8
    const compas = Math.floor(paso / 8) % 4
    const vuelta = Math.floor(paso / 32)
    const a = ACORDES[compas]
    if (enCompas === 0 || enCompas === 4) {
      pluck(c, t, hz(a.bajo), CORCHEA * 3.6, 0.3, 'sine')
      bombo(c, t)
    }
    if (enCompas % 2 === 1) platillo(c, t)
    // arpegio de fondo, siempre
    pluck(c, t, hz(a.notas[[0, 1, 2, 3, 2, 1, 2, 3][enCompas]]), CORCHEA * 1.8, 0.07)
    // la melodía entra en las vueltas impares para que no se repita igual
    const m = MELODIA[compas][enCompas]
    if (m && vuelta % 2 === 1) pluck(c, t, hz(m), CORCHEA * 2.2, 0.13, 'sine')
    siguiente += CORCHEA
    paso++
  }
}

function prepararMaestro(c: AudioContext) {
  if (!maestro) {
    maestro = c.createGain()
    maestro.gain.value = 0
    maestro.connect(c.destination)
  }
  return maestro
}

const aplicarVolumen = (c: AudioContext, rapido = false) => maestro?.gain.setTargetAtTime(volumenDe() * 0.55, c.currentTime, rapido ? 0.02 : 0.4)

function arrancarGenerada(c: AudioContext) {
  prepararMaestro(c)
  if (sonando === 'generada') return
  detenerArchivo()
  siguiente = c.currentTime + 0.1
  paso = 0
  reloj = window.setInterval(() => programar(c), 100)
  sonando = 'generada'
}

function detenerGenerada() {
  if (reloj !== undefined) window.clearInterval(reloj)
  reloj = undefined
}

// ---------- pistas que subes tú ----------

function detenerArchivo() {
  if (!audioPista) return
  audioPista.el.pause()
  audioPista.fuente?.disconnect()
  URL.revokeObjectURL(audioPista.url)
  audioPista = null
  pistaCargada = null
}

async function arrancarArchivo(c: AudioContext, id: string) {
  if (sonando === 'archivo' && pistaCargada === id) return
  const { leerPista } = await import('./archivosMusica')
  const blob = await leerPista(id)
  if (!blob) return arrancarGenerada(c) // si el archivo ya no está, vuelve la predeterminada
  detenerGenerada()
  detenerArchivo()
  prepararMaestro(c)
  const url = URL.createObjectURL(blob)
  const el = new Audio(url)
  el.loop = true
  let fuente: MediaElementAudioSourceNode | null = null
  try {
    fuente = c.createMediaElementSource(el)
    fuente.connect(maestro!)
  } catch {
    el.volume = volumenDe() // sin Web Audio, se controla directo
  }
  audioPista = { el, url, fuente }
  pistaCargada = id
  sonando = 'archivo'
  try {
    await el.play()
  } catch {
    detenerArchivo()
    sonando = null
  }
}

// ---------- control ----------

let versionOrden = 0
/** Pone la música como dicen las preferencias: suena, cambia de pista, sube o baja el volumen, o se calla. */
async function sincronizar() {
  const orden = ++versionOrden
  const c = contextoAudio()
  if (!c) return // todavía no se tocó la pantalla: `intentarMusica` lo reintenta
  if (!quiere() || document.hidden) {
    if (maestro) maestro.gain.setTargetAtTime(0, c.currentTime, 0.15)
    window.setTimeout(() => {
      if (orden !== versionOrden) return
      detenerGenerada()
      audioPista?.el.pause()
      sonando = null
    }, 600)
    return
  }
  if (c.state === 'suspended') await c.resume().catch(() => undefined)
  if (orden !== versionOrden) return
  const pista = pistaElegida()
  if (pista === PREDETERMINADA) arrancarGenerada(c)
  else await arrancarArchivo(c, pista)
  if (orden !== versionOrden) return
  if (audioPista && sonando === 'archivo' && audioPista.el.paused) await audioPista.el.play().catch(() => undefined)
  if (!audioPista?.fuente && audioPista) audioPista.el.volume = volumenDe()
  aplicarVolumen(c)
}

export function configurarMusica(p: PreferenciasMusica | undefined): void {
  prefs = p ?? {}
  void sincronizar()
}

/** Se llama con el primer toque (y al volver a la app): arranca la música si corresponde. */
export function intentarMusica(): void {
  desbloquearAudio()
  void sincronizar()
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => void sincronizar())

/** Para el botón "Probar" de las pistas: no cambia la elección. */
export const detenerMusica = () => {
  versionOrden++
  detenerGenerada()
  detenerArchivo()
  if (maestro) maestro.gain.value = 0
  sonando = null
}
