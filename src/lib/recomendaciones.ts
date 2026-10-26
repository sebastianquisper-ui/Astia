import type { Curso, Habito, ProgresoDia, Tarea } from '../dominio/tipos'
import { diffDays, parseYmd, ymd } from './fechas'
import { cumplido, rachaDe, tocaHoy } from './habitos'
import { metodoPorId, sugerirMetodo, type MetodoId } from './metodos'
import { urgenciaDe, venceEn } from './urgencia'

// "Astia te recomienda": junta lo que ya sabe de tu estudio, tus hábitos, cómo te sientes hoy y, si tú lo
// permites, cómo va tu plata (solo verde/ámbar/rojo, nunca montos). Son reglas simples y explicables.

export type Energia = 'baja' | 'normal' | 'alta'
export type EstadoPlata = 'neutro' | 'verde' | 'ambar' | 'rojo'

export interface ContextoRecomendacion {
  ahora: Date
  /** Tareas activas (no borradas), de la universidad y personales. */
  tareas: Tarea[]
  cursos: Curso[]
  habitos: Habito[]
  progreso: ProgresoDia[]
  /** Cómo dijo el usuario que está hoy; null si no lo dijo. */
  energia: Energia | null
  /** null si el usuario no quiere que Hoy mire su plata. */
  plata: EstadoPlata | null
}

export interface Recomendacion {
  id: string
  titulo: string
  detalle: string
  /** Si hay método y tarea, se puede empezar la sesión guiada desde la tarjeta. */
  metodo?: MetodoId
  tareaId?: string
  /** Más alto, más arriba. */
  prioridad: number
}

const MAX = 3

export function recomendar(c: ContextoRecomendacion): Recomendacion[] {
  const { ahora, tareas, cursos, habitos, energia, plata } = c
  const hoy = ymd(ahora)
  const hoyFecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const pendientes = tareas.filter((t) => t.estado === 'pendiente').sort((a, b) => venceEn(a) - venceEn(b))
  const nombreCurso = (t: Tarea) => cursos.find((x) => x.id === t.cursoId)?.nombre
  const metodoDe = (t: Tarea) => sugerirMetodo(t, nombreCurso(t))
  const dias = (t: Tarea) => diffDays(parseYmd(t.fecha), hoyFecha)

  const vencidas = pendientes.filter((t) => urgenciaDe(t, ahora) === 'vencida')
  const rojas = pendientes.filter((t) => urgenciaDe(t, ahora) === 'roja')
  const examenes = pendientes.filter((t) => t.tipo === 'examen' && dias(t) >= 0 && dias(t) <= 7)
  const cargada = examenes.length > 0 || vencidas.length + rojas.length >= 3
  const habitosHoy = habitos.filter((h) => tocaHoy(h, ahora))
  const faltanHabitos = habitosHoy.filter((h) => !cumplido(h, hoy))
  const lista: Recomendacion[] = []

  // 1. Examen cerca: el método cambia según cuánto falta
  const proximo = examenes[0]
  if (proximo) {
    const d = dias(proximo)
    const metodo: MetodoId = d <= 2 ? 'recuperacion' : 'espaciada'
    const cuando = d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`
    lista.push({
      id: 'examen',
      titulo: `Examen ${cuando}: ${proximo.titulo}`,
      detalle: d <= 2 ? `Faltan pocos días: mejor recordar sin mirar que releer. Usa ${metodoPorId(metodo).nombre}.` : `Aún hay tiempo: repasa un poco cada día con ${metodoPorId(metodo).nombre} en vez de dejarlo todo para el final.`,
      metodo,
      tareaId: proximo.id,
      prioridad: 100 - d * 4,
    })

    // Dormir también es estudiar: cruza estudio con tu hábito de descanso
    if (d <= 1 && ahora.getHours() >= 22) {
      lista.push({ id: 'dormir', titulo: 'Ya es tarde: toca dormir', detalle: 'Con el examen tan cerca, dormir bien te rinde más que estudiar cansado.', prioridad: 110 })
    }
  }

  // 2. Lo vencido primero
  if (vencidas.length) {
    const t = vencidas[0]
    const corto = energia === 'baja'
    lista.push({
      id: 'vencida',
      titulo: `Primero lo vencido: ${t.titulo}`,
      detalle: corto ? 'Con poca energía no hace falta terminarla: empieza con 10 minutos.' : `Es la más atrasada. Empieza con ${metodoPorId(metodoDe(t)).nombre}.`,
      metodo: corto ? 'pomodoro' : metodoDe(t),
      tareaId: t.id,
      prioridad: 90,
    })
  }

  // 3. Cómo te sientes hoy
  if (energia === 'baja' && pendientes.length) {
    const facil = pendientes.find((t) => t.prioridad === 'baja') ?? pendientes[0]
    lista.push({
      id: 'energia-baja',
      titulo: 'Día de poca energía: baja el ritmo, no lo sueltes',
      detalle: `Haz una sola cosa corta${faltanHabitos.some((h) => h.minimo) ? ' y la versión mínima de tus hábitos' : ''}. Empieza por ${facil.titulo}.`,
      metodo: 'pomodoro',
      tareaId: facil.id,
      prioridad: 70,
    })
  }
  if (energia === 'alta') {
    const dificil = pendientes.find((t) => t.prioridad === 'alta') ?? pendientes[0]
    if (dificil)
      lista.push({ id: 'energia-alta', titulo: 'Hoy tienes ganas: aprovéchalas', detalle: `Haz ahora lo que más cuesta: ${dificil.titulo}.`, metodo: metodoDe(dificil), tareaId: dificil.id, prioridad: 72 })
  }

  // 4. Hábitos: no romper rachas y no soltarlos en semanas pesadas
  const enRacha = faltanHabitos.map((h) => ({ h, r: rachaDe(h, ahora) })).filter((x) => x.r.n >= 3).sort((a, b) => b.r.n - a.r.n)[0]
  if (enRacha) lista.push({ id: 'racha', titulo: `No rompas tu racha de ${enRacha.r.n} ${enRacha.r.unidad}`, detalle: `${enRacha.h.nombre}${enRacha.h.minimo ? `: ${enRacha.h.minimo.toLowerCase()}` : ''}.`, prioridad: 65 })
  else if (cargada && faltanHabitos.length)
    lista.push({ id: 'habitos-pesada', titulo: 'Semana pesada: no sueltes tus hábitos', detalle: 'Baja a la versión mínima de cada uno. Es mejor poco que nada.', prioridad: 55 })

  // 5. La plata (solo si el usuario lo permite)
  if (plata === 'rojo' || plata === 'ambar') {
    lista.push(
      cargada
        ? { id: 'plata-carga', titulo: 'Semana cargada y plata ajustada', detalle: 'Antes de que se llene la semana, decide qué vas a gastar y anota cada gasto: con poco tiempo, la plata se escapa sin que lo notes.', prioridad: 58 }
        : { id: 'plata', titulo: plata === 'rojo' ? 'Tu plata está en rojo' : 'Tu plata va ajustada', detalle: 'Dedica 2 minutos hoy a anotar tus gastos y revisa tu presupuesto.', prioridad: plata === 'rojo' ? 50 : 40 },
    )
  }

  // 6. Sin nada urgente
  if (!lista.length && pendientes.length) {
    const t = pendientes[0]
    lista.push({ id: 'siguiente', titulo: `Lo siguiente: ${t.titulo}`, detalle: `Sin apuros hoy. Un bloque con ${metodoPorId(metodoDe(t)).nombre} y sigues.`, metodo: metodoDe(t), tareaId: t.id, prioridad: 20 })
  }
  if (!lista.length && habitosHoy.length === 0 && pendientes.length === 0 && tareas.length > 0)
    lista.push({ id: 'libre', titulo: 'Estás al día', detalle: 'Aprovecha para adelantar algo o repasar un tema.', prioridad: 10 })

  return lista.sort((a, b) => b.prioridad - a.prioridad).slice(0, MAX)
}
