import { fechaDe, horaDe, sinTildes } from './dictadoTareas'
import { ymd } from './fechas'

// Entiende "en 10 minutos comprar pan", "a las 5 de la tarde llamar a mi mamá" o "mañana a las 8 llevar el informe"
// y calcula el momento exacto del aviso. Son reglas del español: sin internet y sin costo.

export interface RecordatorioDictado {
  texto: string
  /** Momento del aviso; null si no se entendió cuándo. */
  cuando: Date | null
}

const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60 }
const NUM = '(\\d{1,3}|' + Object.keys(NUMEROS).join('|') + ')'
const aNum = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMEROS[s])

/** "en 10 minutos", "dentro de media hora", "en una hora y media", "en 2 horas". */
function duracionDe(t: string): { minutos: number; texto: string } | null {
  const inicio = '\\b(?:en|dentro de|de aqui a)\\s+'
  let m: RegExpMatchArray | null
  if ((m = t.match(new RegExp(inicio + 'media hora\\b')))) return { minutos: 30, texto: m[0] }
  if ((m = t.match(new RegExp(inicio + '(?:un )?cuarto de hora\\b')))) return { minutos: 15, texto: m[0] }
  if ((m = t.match(new RegExp(inicio + NUM + ' horas?(?: y media| y cuarto)?(?: y ' + NUM + ' minutos?)?')))) {
    const extra = / y media/.test(m[0]) ? 30 : / y cuarto/.test(m[0]) ? 15 : m[2] ? aNum(m[2]) : 0
    return { minutos: aNum(m[1]) * 60 + extra, texto: m[0] }
  }
  if ((m = t.match(new RegExp(inicio + 'una hora y media\\b')))) return { minutos: 90, texto: m[0] }
  if ((m = t.match(new RegExp(inicio + NUM + ' (?:minutos?|mins?)\\b')))) return { minutos: aNum(m[1]), texto: m[0] }
  if ((m = t.match(new RegExp(inicio + NUM + ' segundos?\\b')))) return { minutos: aNum(m[1]) / 60, texto: m[0] }
  return null
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function interpretarRecordatorio(frase: string, ahora: Date = new Date()): RecordatorioDictado {
  const original = frase.trim().replace(/\s+/g, ' ')
  const t = sinTildes(original)
  let cuando: Date | null = null
  const quitar: string[] = []

  const d = duracionDe(t)
  if (d) {
    cuando = new Date(ahora.getTime() + d.minutos * 60_000)
    quitar.push(d.texto)
  } else {
    const h = horaDe(t)
    if (h) {
      const f = fechaDe(t, ahora)
      const [hh, mm] = h.hora.split(':').map(Number)
      const base = f ? new Date(f.fecha + 'T00:00:00') : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      cuando = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm)
      // "a las 5" sin decir el día: si ya pasó hoy, es mañana
      if (!f && cuando <= ahora) cuando = new Date(cuando.getTime() + 24 * 3_600_000)
      quitar.push(h.texto)
      if (f) quitar.push(f.texto)
    }
  }

  let texto = original
  for (const parte of quitar) {
    const i = sinTildes(texto).indexOf(parte)
    if (i >= 0) texto = (texto.slice(0, i) + ' ' + texto.slice(i + parte.length)).replace(/\s+/g, ' ')
  }
  texto = texto
    .replace(/^(?:por favor[, ]+)?(?:recu[eé]rda(?:me)?|ac[uú]erda(?:me)?|av[ií]sa(?:me)?|recordarme|avisarme|ponme un recordatorio(?: para| de)?|recordatorio(?: de| para)?)\s+(?:que\s+|de\s+)?/i, '')
    .replace(/^(?:tengo que|debo|necesito)\s+/i, 'Tengo que ')
    .replace(/\s+(?:para|de|a|y)\s*$/i, '')
    .replace(/^(?:para|de)\s+/i, '')
    .replace(/[\s,.;:]+$/g, '')
    .trim()
  return { texto: mayuscula(texto), cuando }
}

/** Lo que Alpi dice en voz alta: "Sebastián, tienes que comprar pan". */
export function fraseDeAviso(nombre: string, texto: string): string {
  const limpio = texto.replace(/^tengo que\s+/i, '').trim()
  const infinitivo = /^[a-záéíóúñ]+(?:ar|er|ir)(?:me|te|se|lo|la|los|las)?\b/i.test(limpio)
  const quien = nombre ? nombre + ', ' : ''
  return infinitivo ? `${quien}tienes que ${limpio.charAt(0).toLowerCase() + limpio.slice(1)}.` : `${quien}recuerda: ${limpio.charAt(0).toLowerCase() + limpio.slice(1)}.`
}

/** Texto corto de cuándo: "en 10 min", "hoy 17:00", "mañana 08:00". */
export function cuandoTexto(cuando: Date, ahora: Date = new Date()): string {
  const hh = `${String(cuando.getHours()).padStart(2, '0')}:${String(cuando.getMinutes()).padStart(2, '0')}`
  const falta = Math.round((cuando.getTime() - ahora.getTime()) / 60_000)
  if (falta >= 0 && falta < 60) return falta === 0 ? 'ahora' : `en ${falta} min (${hh})`
  const hoy = ymd(ahora)
  const manana = ymd(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1))
  const dia = ymd(cuando)
  if (dia === hoy) return `hoy ${hh}`
  if (dia === manana) return `mañana ${hh}`
  return `${String(cuando.getDate()).padStart(2, '0')}/${String(cuando.getMonth() + 1).padStart(2, '0')} ${hh}`
}
