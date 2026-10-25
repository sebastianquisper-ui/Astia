// Los sonidos predeterminados de Astia. Se fabrican en el momento con el audio del navegador (Web Audio): no pesan nada, funcionan
// sin internet y se pueden escuchar antes de elegir. En el iPhone el audio solo se permite después de tocar la pantalla.

let contexto: AudioContext | null = null

const Ctor = (): typeof AudioContext | undefined => (typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext))

/** Se llama al tocar la pantalla (cualquier toque): deja el audio listo para sonar. */
export function desbloquearAudio(): void {
  try {
    const C = Ctor()
    if (!C) return
    contexto = contexto ?? new C()
    if (contexto.state === 'suspended') void contexto.resume()
  } catch {
    contexto = null
  }
}

export const audioListo = (): boolean => !!contexto && contexto.state !== 'closed'

type Onda = OscillatorType

function entorno(c: AudioContext, t: number, ataque: number, pico: number, sostén: number, caida: number): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pico, t + ataque)
  g.gain.setValueAtTime(pico, t + ataque + sostén)
  g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + sostén + caida)
  return g
}

/** Una nota con forma de campanita: onda base y un armónico que se apaga más rápido. */
function nota(c: AudioContext, t: number, freq: number, { dur = 0.5, onda = 'sine', pico = 0.18, armonico = 0 }: { dur?: number; onda?: Onda; pico?: number; armonico?: number } = {}): void {
  const g = entorno(c, t, 0.005, pico, 0.01, dur)
  g.connect(c.destination)
  const o = c.createOscillator()
  o.type = onda
  o.frequency.value = freq
  o.connect(g)
  o.start(t)
  o.stop(t + dur + 0.1)
  if (armonico) {
    const g2 = entorno(c, t, 0.003, pico * armonico, 0, dur * 0.4)
    g2.connect(c.destination)
    const o2 = c.createOscillator()
    o2.frequency.value = freq * 2.76
    o2.connect(g2)
    o2.start(t)
    o2.stop(t + dur * 0.5 + 0.1)
  }
}

function ruido(c: AudioContext, dur: number): AudioBuffer {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

// ---- las piezas de la transformación de Alpi (las mismas de su modelo 3D) ----

function carga(c: AudioContext, t: number, dur: number): void {
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(65, t)
  o.frequency.exponentialRampToValueAtTime(240, t + dur)
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(260, t)
  f.frequency.linearRampToValueAtTime(1600, t + dur)
  const g = entorno(c, t, 0.35, 0.16, dur - 0.35, 0.25)
  const lfo = c.createOscillator()
  lfo.frequency.setValueAtTime(9, t)
  lfo.frequency.linearRampToValueAtTime(26, t + dur)
  const lg = c.createGain()
  lg.gain.value = 0.06
  lfo.connect(lg)
  lg.connect(g.gain)
  const n = c.createBufferSource()
  n.buffer = ruido(c, dur + 0.4)
  const nf = c.createBiquadFilter()
  nf.type = 'lowpass'
  nf.frequency.value = 160
  const ng = entorno(c, t, dur * 0.8, 0.5, 0.2, 0.3)
  o.connect(f)
  f.connect(g)
  g.connect(c.destination)
  n.connect(nf)
  nf.connect(ng)
  ng.connect(c.destination)
  for (const x of [o, lfo, n]) {
    x.start(t)
    x.stop(t + dur + 0.5)
  }
}

function chispazo(c: AudioContext, t: number): void {
  const n = c.createBufferSource()
  n.buffer = ruido(c, 0.08)
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 2200
  const g = entorno(c, t, 0.004, 0.12 + Math.random() * 0.1, 0.01, 0.06)
  n.connect(f)
  f.connect(g)
  g.connect(c.destination)
  n.start(t)
}

function grito(c: AudioContext, t: number, dur: number): void {
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(190, t)
  o.frequency.linearRampToValueAtTime(330, t + dur * 0.6)
  o.frequency.linearRampToValueAtTime(300, t + dur)
  const vib = c.createOscillator()
  vib.frequency.value = 7
  const vg = c.createGain()
  vg.gain.value = 9
  vib.connect(vg)
  vg.connect(o.frequency)
  const salida = entorno(c, t, 0.06, 0.22, dur - 0.1, 0.25)
  ;([[820, 7, 1], [1220, 8, 0.7], [2600, 10, 0.25]] as const).forEach(([fr, q, v]) => {
    const b = c.createBiquadFilter()
    b.type = 'bandpass'
    b.frequency.value = fr
    b.Q.value = q
    const bg = c.createGain()
    bg.gain.value = v
    o.connect(b)
    b.connect(bg)
    bg.connect(salida)
  })
  salida.connect(c.destination)
  o.start(t)
  vib.start(t)
  o.stop(t + dur + 0.3)
  vib.stop(t + dur + 0.3)
}

function estruendo(c: AudioContext, t: number): void {
  const n = c.createBufferSource()
  n.buffer = ruido(c, 1.6)
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(1400, t)
  f.frequency.exponentialRampToValueAtTime(70, t + 1.4)
  const g = entorno(c, t, 0.01, 0.9, 0.05, 1.3)
  n.connect(f)
  f.connect(g)
  g.connect(c.destination)
  n.start(t)
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(110, t)
  o.frequency.exponentialRampToValueAtTime(32, t + 0.9)
  const og = entorno(c, t, 0.01, 0.7, 0.05, 0.9)
  o.connect(og)
  og.connect(c.destination)
  o.start(t)
  o.stop(t + 1.2)
}

function destellos(c: AudioContext, t: number): void {
  ;[0, 0.08, 0.17, 0.27, 0.4].forEach((d, i) => nota(c, t + d, [1568, 2093, 2637, 3136, 4186][i], { dur: 0.35, pico: 0.07 }))
}

export interface Preset {
  id: string
  nombre: string
  detalle: string
  /** Lo toca en el instante `t` del audio y devuelve cuánto dura, en segundos. */
  tocar: (c: AudioContext, t: number) => number
}

export const PRESETS: Preset[] = [
  {
    id: 'alpi',
    nombre: 'Transformación de Alpi',
    detalle: 'La carga de energía, el grito y el destello cuando Alpi evoluciona',
    tocar: (c, t) => {
      carga(c, t, 1.6)
      ;[0.95, 1.1, 1.3, 1.45, 1.7, 1.85].forEach((d) => chispazo(c, t + d))
      grito(c, t + 1.6, 0.55)
      estruendo(c, t + 1.95)
      destellos(c, t + 2.0)
      return 3.6
    },
  },
  {
    id: 'campanita',
    nombre: 'Campanita',
    detalle: 'Dos notas suaves y brillantes',
    tocar: (c, t) => {
      nota(c, t, 1318.5, { dur: 0.7, armonico: 0.4 })
      nota(c, t + 0.16, 1760, { dur: 0.9, armonico: 0.4 })
      return 1.1
    },
  },
  {
    id: 'campana',
    nombre: 'Campana',
    detalle: 'Tres campanadas que bajan, como de fin de clase',
    tocar: (c, t) => {
      ;[880, 740, 587].forEach((f, i) => nota(c, t + i * 0.32, f, { dur: 0.9, armonico: 0.5, pico: 0.2 }))
      return 1.9
    },
  },
  {
    id: 'ding',
    nombre: 'Ding',
    detalle: 'Un solo toque limpio',
    tocar: (c, t) => {
      nota(c, t, 1046.5, { dur: 1.0, armonico: 0.3 })
      nota(c, t, 1568, { dur: 0.8, pico: 0.06 })
      return 1.1
    },
  },
  {
    id: 'gota',
    nombre: 'Gota',
    detalle: 'Una gotita de agua',
    tocar: (c, t) => {
      const o = c.createOscillator()
      o.frequency.setValueAtTime(1300, t)
      o.frequency.exponentialRampToValueAtTime(420, t + 0.13)
      const g = entorno(c, t, 0.005, 0.2, 0.02, 0.2)
      o.connect(g)
      g.connect(c.destination)
      o.start(t)
      o.stop(t + 0.4)
      nota(c, t + 0.2, 880, { dur: 0.25, pico: 0.05 })
      return 0.5
    },
  },
  {
    id: 'moneda',
    nombre: 'Moneda',
    detalle: 'El tintineo de una moneda',
    tocar: (c, t) => {
      nota(c, t, 1976, { dur: 0.12, onda: 'square', pico: 0.06 })
      nota(c, t + 0.07, 2637, { dur: 0.7, onda: 'square', pico: 0.05, armonico: 0.5 })
      return 0.9
    },
  },
  {
    id: 'tada',
    nombre: '¡Tadá!',
    detalle: 'Una mini fanfarria de logro',
    tocar: (c, t) => {
      ;[523.25, 659.25, 784, 1046.5].forEach((f, i) => nota(c, t + i * 0.1, f, { dur: 0.25, onda: 'triangle', pico: 0.16 }))
      ;[523.25, 659.25, 784, 1046.5].forEach((f) => nota(c, t + 0.45, f, { dur: 0.9, onda: 'triangle', pico: 0.1 }))
      return 1.4
    },
  },
  {
    id: 'marimba',
    nombre: 'Marimba',
    detalle: 'Cuatro notas que suben alegres',
    tocar: (c, t) => {
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(c, t + i * 0.11, f, { dur: 0.3, onda: 'triangle', pico: 0.2, armonico: 0.3 }))
      return 0.8
    },
  },
  {
    id: 'destellos',
    nombre: 'Destellos',
    detalle: 'Chispitas mágicas que suben',
    tocar: (c, t) => {
      destellos(c, t)
      return 0.9
    },
  },
  {
    id: 'alerta',
    nombre: 'Alerta suave',
    detalle: 'Dos pitidos cortos',
    tocar: (c, t) => {
      ;[0, 0.3].forEach((d) => nota(c, t + d, 880, { dur: 0.22, pico: 0.22 }))
      return 0.7
    },
  },
  {
    id: 'fanfarria',
    nombre: 'Fanfarria',
    detalle: 'Un acorde grande, para los grandes logros',
    tocar: (c, t) => {
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(500, t)
      f.frequency.linearRampToValueAtTime(3000, t + 0.5)
      f.connect(c.destination)
      const g = entorno(c, t, 0.04, 0.12, 0.7, 0.8)
      g.connect(f)
      ;[261.63, 329.63, 392, 523.25].forEach((fr, i) => {
        const o = c.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = fr
        o.detune.value = i * 4
        o.connect(g)
        o.start(t)
        o.stop(t + 1.7)
      })
      return 1.7
    },
  },
]

export const presetPorId = (id: string): Preset | undefined => PRESETS.find((p) => p.id === id)

/** Toca un sonido predeterminado ahora. Devuelve su duración en milisegundos (0 si no pudo sonar). */
export function tocarPreset(id: string): number {
  const p = presetPorId(id)
  if (!p) return 0
  try {
    desbloquearAudio()
    const c = contexto
    if (!c) return 0
    return Math.round(p.tocar(c, c.currentTime + 0.02) * 1000)
  } catch {
    return 0 // si el navegador no deja sonar, la pantalla igual avisa
  }
}
