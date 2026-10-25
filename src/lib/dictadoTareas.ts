import type { Curso, TipoTarea } from '../dominio/tipos'
import { addDays, ymd } from './fechas'

// Entiende una frase como "examen de cálculo el viernes a las 3 de la tarde" y la convierte en una tarea para confirmar.
// Son reglas del español (sin servidor ni costo); lo que no entienda queda para que lo corrijas en el formulario.

export interface TareaDictada {
  titulo: string
  cursoId: string | null
  tipo: TipoTarea
  fecha: string | null
  hora: string | null
}

export const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const NUMEROS: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 }
const NUM = '(\\d{1,2}|' + Object.keys(NUMEROS).join('|') + ')'
const aNumero = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMEROS[s])

export function fechaDe(t: string, hoy: Date): { fecha: string; texto: string } | null {
  let m: RegExpMatchArray | null
  if ((m = t.match(/\bpasado manana\b/))) return { fecha: ymd(addDays(hoy, 2)), texto: m[0] }
  if ((m = t.match(/\bmanana\b/))) return { fecha: ymd(addDays(hoy, 1)), texto: m[0] }
  if ((m = t.match(/\bhoy\b/))) return { fecha: ymd(hoy), texto: m[0] }
  if ((m = t.match(new RegExp('\\ben ' + NUM + ' dias?\\b')))) return { fecha: ymd(addDays(hoy, aNumero(m[1]))), texto: m[0] }
  if ((m = t.match(/\ben una semana\b|\bla proxima semana\b|\bla semana que viene\b/))) return { fecha: ymd(addDays(hoy, 7)), texto: m[0] }
  const nombreMes = MESES.join('|') + '|setiembre'
  if ((m = t.match(new RegExp('\\b(?:el )?(\\d{1,2}) de (' + nombreMes + ')\\b')))) {
    const mes = MESES.indexOf(m[2] === 'setiembre' ? 'septiembre' : m[2])
    let f = new Date(hoy.getFullYear(), mes, Number(m[1]))
    if (f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) f = new Date(hoy.getFullYear() + 1, mes, Number(m[1]))
    return { fecha: ymd(f), texto: m[0] }
  }
  if ((m = t.match(new RegExp('\\b(?:el|este|para el|para este|este proximo|el proximo) (' + DIAS.join('|') + ')\\b')))) {
    const objetivo = DIAS.indexOf(m[1])
    const falta = ((objetivo - hoy.getDay() + 7) % 7) || 7 // siempre el próximo, nunca hoy
    return { fecha: ymd(addDays(hoy, falta)), texto: m[0] }
  }
  if ((m = t.match(/\b(?:el|para el) (\d{1,2})\b(?! (?:de|horas|h|min))/))) {
    const dia = Number(m[1])
    if (dia >= 1 && dia <= 31) {
      let f = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
      if (f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) f = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
      return { fecha: ymd(f), texto: m[0] }
    }
  }
  return null
}

export function horaDe(t: string): { hora: string; texto: string } | null {
  let m = t.match(/\ba las (\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\. ?m\.?|p\. ?m\.?)?/)
  let aviso = true
  if (!m) {
    m = t.match(new RegExp('\\ba las ' + NUM + '(?: y (media|cuarto))?(?: de la (manana|tarde|noche))?'))
    aviso = false
  }
  if (!m) return null
  let h: number
  let min = 0
  let periodo = ''
  if (aviso) {
    h = Number(m[1])
    min = m[2] ? Number(m[2]) : 0
    periodo = (m[3] ?? '').replace(/[^a-z]/g, '')
  } else {
    h = aNumero(m[1])
    min = m[2] === 'media' ? 30 : m[2] === 'cuarto' ? 15 : 0
    periodo = m[3] === 'manana' ? 'am' : m[3] ? 'pm' : ''
  }
  const resto = t.slice((m.index ?? 0) + m[0].length)
  const delDia = resto.match(/^\s*de la (manana|tarde|noche)/)
  if (!periodo && delDia) periodo = delDia[1] === 'manana' ? 'am' : 'pm'
  if (periodo === 'pm' && h < 12) h += 12
  if (periodo === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return { hora: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, texto: m[0] + (delDia && !m[3] ? delDia[0] : '') }
}

function tipoDe(t: string): TipoTarea {
  if (/\b(examen|parcial|final|practica calificada|pc\d?|prueba|evaluacion|control)\b/.test(t)) return 'examen'
  if (/\b(estudiar|repasar|repaso|revisar apuntes|leer|prepararme?)\b/.test(t)) return 'estudio'
  return 'tarea'
}

function cursoDe(t: string, cursos: Curso[]): string | null {
  const palabras = (s: string) => sinTildes(s).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !['del', 'los', 'las', 'con'].includes(p))
  let mejor: { id: string; puntos: number } | null = null
  for (const c of cursos) {
    const nombre = sinTildes(c.nombre)
    let puntos = t.includes(nombre) ? 10 : 0
    for (const p of palabras(c.nombre)) if (new RegExp('\\b' + p).test(t)) puntos += 3
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { id: c.id, puntos }
  }
  return mejor?.id ?? null
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Convierte la frase dictada en los campos de una tarea. `hoy` se pasa para poder probarlo. */
export function interpretarTarea(frase: string, cursos: Curso[], hoy: Date = new Date()): TareaDictada {
  const original = frase.trim().replace(/\s+/g, ' ')
  let t = sinTildes(original)
  const h = horaDe(t)
  const f = fechaDe(t, hoy)
  // Se quitan del título las partes que ya son fecha y hora (se cortan sobre el texto sin tildes: mismas posiciones)
  let titulo = original
  for (const parte of [h?.texto, f?.texto]) {
    if (!parte) continue
    const i = sinTildes(titulo).indexOf(parte)
    if (i >= 0) titulo = (titulo.slice(0, i) + ' ' + titulo.slice(i + parte.length)).replace(/\s+/g, ' ')
  }
  titulo = titulo
    .replace(/^(?:por favor[, ]+)?(?:agrega(?:r|me)?|anota(?:r|me)?|crea(?:r|me)?|recuerda(?:me)?|tengo que|tengo|debo|necesito)\s+(?:una?\s+)?(?:nueva?\s+)?(?:tarea\s+(?:de|para|:)?\s*)?/i, '')
    .replace(/\s+(?:para|de|el|a)\s*$/i, '')
    .replace(/\s+(?:para|el|a)\s*$/i, '')
    .replace(/[\s,.;:]+$/g, '')
    .trim()
  t = sinTildes(original)
  return { titulo: mayuscula(titulo), cursoId: cursoDe(t, cursos), tipo: tipoDe(t), fecha: f?.fecha ?? null, hora: h?.hora ?? null }
}

