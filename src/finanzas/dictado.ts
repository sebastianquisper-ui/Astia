import { CATEGORIA_TRANSFERENCIA } from './modelo'
import { sumarDias } from './periodos'
import type { Config, Medio, Meta } from './tipos'

// Entiende una frase hablada o escrita ("gasté 15 soles en almuerzo") y la convierte en un movimiento. Es un entendedor con
// reglas del idioma: funciona sin internet y sin costo. Es el "intérprete" por defecto; más adelante se puede cambiar por uno con
// inteligencia artificial (de pago) sin tocar el resto de la app: basta con otra función que cumpla `Interprete`.

export interface Contexto {
  config: Config
  metas: Meta[]
  /** "AAAA-MM-DD" */
  hoy: string
  /** La billetera que estás viendo: se usa si en la frase no dices cuál. */
  medioPorDefecto: Medio
}

interface Base {
  /** Cosas que Alpi no pudo saber o tuvo que suponer; se muestran para que las revises. */
  dudas: string[]
}
export type Interpretacion =
  | (Base & { tipo: 'gasto' | 'ingreso'; monto: number; categoria: string | null; categoriaNueva: boolean; medio: Medio; fecha: string; nota: string })
  | (Base & { tipo: 'transferencia'; monto: number; origen: Medio; destino: Medio; fecha: string; nota: string })
  | (Base & { tipo: 'aporte'; monto: number; meta: Meta | null; fecha: string })
  | (Base & { tipo: 'retiro'; monto: number; meta: Meta | null; fecha: string })
  | { tipo: 'nada'; motivo: string; dudas: string[] }

export type Interprete = (texto: string, ctx: Contexto) => Interpretacion | Promise<Interpretacion>

// ---------- normalizar ----------

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[¿?¡!"“”.,;:()]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** "almuerzos" → "almuerzo": se compara sin plural. */
const raiz = (w: string): string => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)

// ---------- números en palabras ----------

const UNIDADES: Record<string, number> = {
  cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
  doscientas: 200, trescientas: 300, cuatrocientas: 400, quinientas: 500, seiscientas: 600, setecientas: 700, ochocientas: 800, novecientas: 900,
}
const ES_NUMERO = (w: string) => w in UNIDADES || w === 'mil'
const ARTICULOS = new Set(['un', 'una', 'uno'])

/** Cambia los números escritos con palabras por cifras: "treinta y cinco soles" → "35 soles". Un "un/una" suelto no cuenta ("una laptop"). */
export function palabrasANumeros(normalizado: string): string {
  const t = normalizado.split(' ')
  const salida: string[] = []
  for (let i = 0; i < t.length; ) {
    if (!ES_NUMERO(t[i])) {
      salida.push(t[i])
      i++
      continue
    }
    // un tramo de palabras-número (con "y" entre decenas y unidades)
    let j = i
    const tramo: string[] = []
    while (j < t.length) {
      if (ES_NUMERO(t[j])) tramo.push(t[j++])
      else if (t[j] === 'y' && j + 1 < t.length && ES_NUMERO(t[j + 1]) && tramo.length && (UNIDADES[tramo[tramo.length - 1]] ?? 0) >= 20 && (UNIDADES[tramo[tramo.length - 1]] ?? 0) < 100 && (UNIDADES[t[j + 1]] ?? 100) < 10) j++
      else break
    }
    const soloArticulo = tramo.length === 1 && ARTICULOS.has(tramo[0])
    const siguiente = t[j] ?? ''
    if (soloArticulo && !/^(sol|soles)$/.test(siguiente)) {
      salida.push(...tramo)
    } else {
      let total = 0
      let actual = 0
      for (const w of tramo) {
        if (w === 'mil') {
          total += (actual || 1) * 1000
          actual = 0
        } else actual += UNIDADES[w]
      }
      salida.push(String(total + actual))
    }
    i = j
  }
  return salida.join(' ')
}

// ---------- monto ----------

const RE_NUM = /\d{1,3}(?:[.,]\d{3})+(?!\d)|\d+(?:[.,]\d{1,2})?/g

function aNumero(texto: string): number {
  // "1,200" / "1.200" son miles; "15,50" / "15.5" son decimales
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(texto)) return Number(texto.replace(/[.,]/g, ''))
  return Number(texto.replace(',', '.'))
}

/** El monto de la frase y el texto sin él. Elige el número pegado a "soles" o a "S/". */
function buscarMonto(t: string): { monto: number; resto: string } | null {
  // "20 soles con 50", "20 con 50 céntimos", "15 soles y 50 centimos"
  const decimal = /(\d+)\s*(?:soles?|s\/)?\s*(?:con|y)\s*(\d{1,2})\s*(centimos?|centavos?)?/.exec(t)
  if (decimal && (decimal[3] || /con/.test(decimal[0])) && Number(decimal[2]) < 100) {
    const resto = (t.slice(0, decimal.index) + ' ' + t.slice(decimal.index + decimal[0].length)).replace(/\s+/g, ' ').trim()
    return { monto: Number(decimal[1]) + Number(decimal[2].padEnd(2, '0').slice(0, 2)) / 100, resto }
  }
  const candidatos: { monto: number; puntos: number; ini: number; fin: number }[] = []
  for (const m of t.matchAll(RE_NUM)) {
    const ini = m.index ?? 0
    const fin = ini + m[0].length
    const antes = t.slice(Math.max(0, ini - 4), ini)
    const despues = t.slice(fin, fin + 8)
    let puntos = 0
    if (/^\s*(soles?|sol|nuevos|s\/)/.test(despues)) puntos += 3
    if (/s\/\s*$/.test(antes)) puntos += 3
    if (/(por|de)\s*$/.test(antes)) puntos += 1
    candidatos.push({ monto: aNumero(m[0]), puntos, ini, fin })
  }
  if (!candidatos.length) return null
  const mejor = candidatos.reduce((a, b) => (b.puntos > a.puntos ? b : a))
  const quitar = t.slice(mejor.fin).match(/^\s*(soles?|sol|nuevos soles)\b/)?.[0] ?? ''
  const antesS = /s\/\s*$/.test(t.slice(0, mejor.ini)) ? t.slice(0, mejor.ini).replace(/s\/\s*$/, '') : t.slice(0, mejor.ini)
  return { monto: mejor.monto, resto: (antesS + ' ' + t.slice(mejor.fin + quitar.length)).replace(/\s+/g, ' ').trim() }
}

// ---------- fecha ----------

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function buscarFecha(t: string, hoy: string): { fecha: string; resto: string } {
  const quita = (re: RegExp) => t.replace(re, ' ').replace(/\s+/g, ' ').trim()
  if (/\b(anteayer|antier|antes de ayer)\b/.test(t)) return { fecha: sumarDias(hoy, -2), resto: quita(/\b(anteayer|antier|antes de ayer)\b/) }
  if (/\bayer\b/.test(t)) return { fecha: sumarDias(hoy, -1), resto: quita(/\bayer\b/) }
  if (/\bhoy\b/.test(t)) return { fecha: hoy, resto: quita(/\bhoy\b/) }
  const hace = /\bhace (\d{1,2}) dias?\b/.exec(t)
  if (hace) return { fecha: sumarDias(hoy, -Number(hace[1])), resto: quita(/\bhace \d{1,2} dias?\b/) }
  for (const [i, d] of DIAS_SEMANA.entries()) {
    const re = new RegExp(`\\b(?:el )?${d}(?: pasado)?\\b`)
    if (re.test(t)) {
      const hoyDia = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1, Number(hoy.slice(8, 10))).getDay()
      let atras = (hoyDia - i + 7) % 7
      if (atras === 0) atras = 7
      return { fecha: sumarDias(hoy, -atras), resto: quita(re) }
    }
  }
  return { fecha: hoy, resto: t }
}

// ---------- billetera ----------

const RE_EFECTIVO = /\b(efectivo|cash|en mano|monedas?|billetes?)\b/
const RE_DIGITAL = /\b(digital|yape|plin|tarjeta|banco|bancaria|debito|credito|bcp|bbva|interbank|scotiabank|cuenta)\b/

function buscarMedio(t: string): Medio | null {
  const e = RE_EFECTIVO.exec(t)
  const d = RE_DIGITAL.exec(t)
  if (e && d) return e.index < d.index ? 'efectivo' : 'digital'
  return e ? 'efectivo' : d ? 'digital' : null
}

// ---------- categorías ----------

const SINONIMOS: Record<string, string[]> = {
  // gastos
  almuerzos: ['almuerzo', 'menu', 'desayuno', 'cena', 'comida', 'lonche', 'comi'],
  comerrico: ['antojo', 'helado', 'postre', 'chifa', 'pollo', 'pizza', 'hamburguesa', 'restaurante', 'cafe', 'snack', 'dulce', 'gaseosa', 'comer rico'],
  tecnologia: ['celular', 'laptop', 'mouse', 'cable', 'cargador', 'audifonos', 'software', 'juego', 'app', 'computadora', 'teclado', 'pantalla', 'tecnologia'],
  pasajes: ['pasaje', 'taxi', 'combi', 'bus', 'metro', 'metropolitano', 'movilidad', 'uber', 'cabify', 'colectivo', 'mototaxi', 'transporte'],
  extras: ['extra', 'otros', 'varios'],
  // ingresos
  sueldo: ['sueldo', 'salario', 'quincena', 'honorarios', 'pago del trabajo'],
  propina: ['propina'],
  venta: ['venta', 'vendi'],
  regalo: ['regalo', 'regalaron', 'cumpleanos'],
}

const palabrasDe = (s: string) => norm(s).split(' ').filter(Boolean).map(raiz)

interface ResultadoCategoria {
  categoria: string | null
  nueva: boolean
}

function buscarCategoria(t: string, lista: string[]): ResultadoCategoria {
  const palabras = new Set(palabrasDe(t))
  const textoPlano = ' ' + norm(t) + ' '
  // "categoría tal" nombra una categoría explícita
  const explicita = /\bcategoria\s+(?:de\s+|llamada\s+)?([a-z0-9 ]{2,30}?)(?=\s+(?:de|en|con|por|ayer|hoy|a)\b|$)/.exec(norm(t))
  let mejor: { nombre: string; puntos: number } | null = null
  for (const nombre of lista) {
    const n = norm(nombre)
    const clave = n.replace(/\s+/g, '')
    const ws = palabrasDe(nombre)
    let puntos = 0
    if (ws.length && ws.every((w) => palabras.has(w))) puntos = 3
    else if (textoPlano.includes(' ' + n + ' ')) puntos = 3
    else if ((SINONIMOS[clave] ?? []).some((s) => palabrasDe(s).every((w) => palabras.has(w)))) puntos = 2
    if (puntos && (!mejor || puntos > mejor.puntos)) mejor = { nombre, puntos }
  }
  if (mejor) return { categoria: mejor.nombre, nueva: false }
  if (explicita) {
    const nombre = explicita[1].trim()
    return { categoria: nombre.charAt(0).toUpperCase() + nombre.slice(1), nueva: true }
  }
  return { categoria: null, nueva: false }
}

// ---------- el entendedor ----------

const VERBOS_INGRESO = /\b(me llego|me llegaron|llego|llegaron|ingreso|ingresaron|ingresos|cobre|cobramos|recibi|recibimos|me pagaron|me depositaron|me abonaron|me transfirieron|me pagan|gane|vendi|me dieron|me regalaron|me dio)\b/
const VERBOS_GASTO = /\b(gaste|gastamos|pague|pagamos|compre|compramos|me cobraron|gasto|pago|compra|fue)\b/
const VERBOS_APORTE = /\b(aporte|aportamos|ahorre|ahorramos|guarde|guardamos|abone a|separe|aporto)\b/
const VERBOS_RETIRO = /\b(retire de|saque de|saque de mi|quite de)\b/

function buscarNota(original: string): string {
  const n = /\bnota[: ]+(.{1,200})$/i.exec(original)
  if (n) return n[1].trim()
  const con = /\b(con (?!efectivo|yape|plin|tarjeta|cash)[A-ZÁÉÍÓÚÑa-záéíóúñ]+(?: [A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\s*$/.exec(original.replace(/[.!?]+$/, ''))
  return con ? con[1].trim() : ''
}

function medioOpuesto(m: Medio): Medio {
  return m === 'digital' ? 'efectivo' : 'digital'
}

export const interpretarConReglas: Interprete = (texto, ctx) => {
  const original = texto.trim()
  if (!original) return { tipo: 'nada', motivo: 'Dime qué pasó con tu plata, por ejemplo: "gasté 15 soles en almuerzo".', dudas: [] }
  const t0 = palabrasANumeros(norm(original))
  const fechaR = buscarFecha(t0, ctx.hoy)
  const montoR = buscarMonto(fechaR.resto)
  if (!montoR) return { tipo: 'nada', motivo: 'No escuché cuánto fue. Di el monto, por ejemplo: "gasté 15 soles en almuerzo".', dudas: [] }
  const { monto } = montoR
  const t = montoR.resto
  if (!(monto > 0)) return { tipo: 'nada', motivo: 'El monto tiene que ser mayor que 0.', dudas: [] }
  const fecha = fechaR.fecha
  const dudas: string[] = []

  // ¿Transferencia entre billeteras?
  const deA = /\bde\s+(efectivo|cash)\s+a(?:l)?\s+(digital|banco|yape|plin|tarjeta|cuenta)/.test(t)
  const aDe = /\bde\s+(digital|banco|yape|plin|tarjeta|cuenta)\s+a(?:l)?\s+(efectivo|cash)/.test(t)
  const cajero = /\b(saque|retire|saco|retiro)\b.*\b(cajero|banco|agente)\b/.test(t)
  const deposito = /\b(deposite|deposito|consigne)\b/.test(t) && /\b(banco|cuenta|yape|plin|agente)\b/.test(t)
  const verboTransfer = /\b(transferi|pase|cambie|movi|mande|transfiero)\b/.test(t)
  if (deA || aDe || cajero || deposito || (verboTransfer && /\b(a|al|hacia)\s+(efectivo|cash|digital|banco|yape|plin|tarjeta|cuenta)\b/.test(t))) {
    let origen: Medio
    if (aDe || cajero) origen = 'digital'
    else if (deA || deposito) origen = 'efectivo'
    else origen = /\b(a|al|hacia)\s+(efectivo|cash)\b/.test(t) ? 'digital' : 'efectivo'
    return { tipo: 'transferencia', monto, origen, destino: medioOpuesto(origen), fecha, nota: buscarNota(original), dudas }
  }

  // ¿Aporte (o retiro) de una meta?
  const esRetiro = VERBOS_RETIRO.test(t) && /\bmeta\b|\bahorro/.test(t)
  const esAporte = VERBOS_APORTE.test(t)
  const mencionaMeta = ctx.metas.find((m) => {
    const palabras = palabrasDe(m.nombre).filter((w) => w.length >= 4)
    const del = new Set(palabrasDe(t))
    return palabras.length > 0 && palabras.every((w) => del.has(w))
  })
  if (esRetiro || esAporte || (mencionaMeta && /\b(a|para|en)\b/.test(t) && !VERBOS_GASTO.test(t) && !VERBOS_INGRESO.test(t))) {
    let meta = mencionaMeta ?? null
    if (!meta) {
      const parcial = ctx.metas.filter((m) => palabrasDe(m.nombre).some((w) => w.length >= 4 && palabrasDe(t).includes(w)))
      if (parcial.length === 1) meta = parcial[0]
      else if (!parcial.length && ctx.metas.length === 1) meta = ctx.metas[0]
    }
    if (!meta) dudas.push(ctx.metas.length ? 'No supe a qué meta. Elige una.' : 'Todavía no tienes metas. Crea una primero.')
    return { tipo: esRetiro ? 'retiro' : 'aporte', monto, meta, fecha, dudas }
  }

  // Gasto o ingreso
  const ing = VERBOS_INGRESO.exec(t)
  const gas = VERBOS_GASTO.exec(t)
  let tipo: 'gasto' | 'ingreso'
  if (ing && gas) tipo = ing.index < gas.index ? 'ingreso' : 'gasto'
  else if (ing) tipo = 'ingreso'
  else if (gas) tipo = 'gasto'
  else {
    const esIngresoPorCategoria = buscarCategoria(t, ctx.config.categoriasIngreso).categoria !== null && buscarCategoria(t, ctx.config.categoriasGasto).categoria === null
    tipo = esIngresoPorCategoria ? 'ingreso' : 'gasto'
    dudas.push(`No dijiste si fue gasto o ingreso: lo anoté como ${tipo}.`)
  }

  const lista = tipo === 'ingreso' ? ctx.config.categoriasIngreso : ctx.config.categoriasGasto
  const cat = buscarCategoria(t, lista.filter((c) => c !== CATEGORIA_TRANSFERENCIA))
  if (!cat.categoria) dudas.push('No encontré la categoría. Elígela al corregir.')
  const medio = buscarMedio(t) ?? ctx.medioPorDefecto
  return { tipo, monto, categoria: cat.categoria, categoriaNueva: cat.nueva, medio, fecha, nota: buscarNota(original), dudas }
}

/** El intérprete que usa la app. Para pasar a uno con inteligencia artificial, cámbialo aquí. */
export const interpretar: Interprete = interpretarConReglas

