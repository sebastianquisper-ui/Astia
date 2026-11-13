import { useCallback, useEffect, useRef, useState } from 'react'
import { useFinanzasOpcional } from '../finanzas/FinanzasProvider'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { alarmasPendientes, claseInminente, claveDeAlarma, normalizarHoras, pendientesParaAlarma } from '../lib/alarmas'
import { leerLocal, guardarLocal } from '../lib/almacen'
import type { Tarea } from '../dominio/tipos'
import { avisosDeTareaQueTocan, leerConfigs } from '../lib/avisosTarea'
import { leerRecurrentes, recurrentesQueTocan, type ItemRecurrente } from '../lib/avisosRecurrentes'
import { indiceDia, ymd } from '../lib/fechas'
import { cumplido, tocaHoy } from '../lib/habitos'
import { textoVence } from '../lib/urgencia'
import { sonar } from '../sonidos/reproductor'
import { decirRecordatorio } from '../sonidos/voz'
import { PantallaAviso, type AvisoGrande } from './PantallaAviso'

const CLAVE = 'astia.alarmas.mostradas'
const hoyTexto = () => ymd(new Date())

/** Solo se recuerdan las del día de hoy y de ayer: el resto no sirve y la lista no crece sin fin. */
function leerMostradas(): Set<string> {
  const g = leerLocal<{ dia: string; claves: string[] }>(CLAVE, { dia: '', claves: [] })
  return new Set(g.dia === hoyTexto() ? g.claves : [])
}

/** Se pone en el hash cuando se pulsa "Ver mis pendientes". */
const IR_A_PENDIENTES = '#/tareas'

/**
 * Vigila las alarmas diarias y el aviso antes de cada clase. Cuando toca, tapa la pantalla con un aviso grande, suena
 * y Alpi lo dice en voz alta. Funciona con Astia abierta (o al volver a abrirla poco después de la hora).
 */
export function MotorAlarmas() {
  const { ajustes, cambiar } = useAjustes()
  const { tareas, clases, cursos, habitos, rutinas } = useDatos()
  const finanzas = useFinanzasOpcional()
  const [aviso, setAviso] = useState<AvisoGrande | null>(null)
  const mostradas = useRef<Set<string>>(leerMostradas())
  const pospuesto = useRef<{ hasta: number; aviso: AvisoGrande } | null>(null)
  const ultimo = useRef({ ajustes, tareas, clases, cursos, aviso, habitos, rutinas, metas: finanzas?.metas ?? null })
  ultimo.current = { ajustes, tareas, clases, cursos, aviso, habitos, rutinas, metas: finanzas?.metas ?? null }

  const marcar = useCallback((clave: string) => {
    mostradas.current.add(clave)
    guardarLocal(CLAVE, { dia: hoyTexto(), claves: [...mostradas.current] })
  }, [])

  const mostrar = useCallback((a: AvisoGrande, frase: string) => {
    setAviso(a)
    void sonar('recordatorio')
    decirRecordatorio(frase)
  }, [])

  useEffect(() => {
    const revisar = () => {
      const { ajustes: aj, tareas: ts, clases: cs, cursos: cu, aviso: abierto, habitos: hs, rutinas: rs, metas: ms } = ultimo.current
      const ahora = new Date()
      // Un aviso pospuesto vuelve a su hora
      if (!abierto && pospuesto.current && pospuesto.current.hasta <= ahora.getTime()) {
        const { aviso: a } = pospuesto.current
        pospuesto.current = null
        mostrar(a, a.tipo === 'clase' ? `${a.curso}, ${a.inicio}` : 'Tienes pendientes por revisar')
        return
      }
      if (abierto) return
      const nombreCurso = (id: string | null) => cu.find((c) => c.id === id)?.nombre ?? ''

      // Avisos que tú configuraste para una tarea (botón "Configurar avisos"): funcionan aunque las alarmas diarias estén apagadas
      const deTarea = avisosDeTareaQueTocan(ts, leerConfigs(), ahora, mostradas.current)
      if (deTarea.length) {
        for (const a of deTarea) marcar(a.clave)
        const a = deTarea[0]
        mostrar({ tipo: 'tarea', titulo: a.tarea.titulo, curso: nombreCurso(a.tarea.cursoId), cuando: textoVence(a.tarea, ahora) }, `${a.tarea.titulo}. ${textoVence(a.tarea, ahora)}`)
        return
      }

      // Metas de ahorro de Finanstia con aviso (solo con Finanstia abierta; nunca muestra montos)
      if (ms?.length) {
        const pseudo = ms.filter((m) => m.limite).map((m) => ({ id: 'meta-' + m.id, actualizadoEn: 0, titulo: m.nombre, area: 'personal', cursoId: null, tipo: 'tarea', fecha: m.limite!, prioridad: 'media', pideEvidencia: false, pasos: [], estado: 'pendiente' }) as Tarea)
        const m = avisosDeTareaQueTocan(pseudo, leerConfigs(), ahora, mostradas.current)
        if (m.length) {
          for (const a of m) marcar(a.clave)
          mostrar({ tipo: 'simple', etiqueta: 'Tu meta de ahorro', titulo: m[0].tarea.titulo, sub: textoVence(m[0].tarea, ahora), destino: '#/metas', modo: 'finanzas' }, `Tu meta ${m[0].tarea.titulo}. ${textoVence(m[0].tarea, ahora)}`)
          return
        }
      }

      // Hábitos, rutinas y "anotar gastos": a las horas que elegiste, los días que toca y si aún no lo cumpliste
      const hoyY = ymd(ahora)
      const items: ItemRecurrente[] = [
        ...hs.map((h) => ({ id: 'h-' + h.id, titulo: h.nombre, pendienteHoy: tocaHoy(h, ahora) && !cumplido(h, hoyY), etiqueta: 'Es hora de tu hábito', sub: h.minimo ? `Mínimo: ${h.minimo}` : '', destino: '#/habitos', modo: 'personal' as const })),
        ...rs.map((r) => ({ id: 'r-' + r.id, titulo: r.nombre, pendienteHoy: (r.dias.length === 0 || r.dias.includes(indiceDia(ahora))) && !r.registro.includes(hoyY), etiqueta: 'Es hora de tu rutina', sub: '', destino: '#/mas/rutinas', modo: 'personal' as const })),
        { id: 'plata', titulo: 'Anota tus gastos', pendienteHoy: true, etiqueta: 'Finanstia', sub: 'Que no se te pase ninguno', destino: '#/movimientos', modo: 'finanzas' as const },
      ]
      const rec = recurrentesQueTocan(items, leerRecurrentes(), ahora, mostradas.current)
      if (rec.length) {
        for (const r of rec) marcar(r.clave)
        const { item } = rec[0]
        mostrar({ tipo: 'simple', etiqueta: item.etiqueta, titulo: item.titulo, sub: item.sub, destino: item.destino, modo: item.modo }, `${item.etiqueta}: ${item.titulo}`)
        return
      }

      const al = aj.alarmas
      if (!al?.activo) return

      const clase = claseInminente(cs, ahora, al.claseMin ?? 0)
      if (clase && !mostradas.current.has(clase.clave)) {
        marcar(clase.clave)
        const curso = nombreCurso(clase.clase.cursoId) || 'Tu clase'
        mostrar({ tipo: 'clase', curso, aula: clase.clase.aula, inicio: clase.clase.inicio, minutos: clase.minutos }, `${curso} ${clase.minutos <= 1 ? 'ya va a empezar' : `empieza en ${clase.minutos} minutos`}`)
        return
      }

      const toca = alarmasPendientes(normalizarHoras(al.horas), ahora, mostradas.current)
      if (toca.length) {
        // Si pasaron varias, se muestra la más reciente y se dan por vistas todas
        for (const h of toca) marcar(claveDeAlarma(ahora, h))
        const pendientes = pendientesParaAlarma(ts, ahora)
        if (pendientes.length === 0 && al.soloSiPendientes !== false) return
        const hora = toca[toca.length - 1]
        mostrar(
          { tipo: 'alarma', hora, pendientes, cursoDe: (t) => nombreCurso(t.cursoId) },
          pendientes.length ? `Tienes ${pendientes.length} ${pendientes.length === 1 ? 'pendiente' : 'pendientes'}. El más urgente: ${pendientes[0].titulo}` : 'No tienes pendientes. ¡Bien!',
        )
      }
    }
    const id = window.setInterval(revisar, 1000)
    const alVolver = () => !document.hidden && revisar()
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', revisar)
    revisar()
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', revisar)
    }
  }, [mostrar, marcar])

  // Para probar desde Ajustes sin esperar la hora
  useEffect(() => {
    const probar = () => {
      const { tareas: ts, cursos: cu } = ultimo.current
      const pendientes = pendientesParaAlarma(ts, new Date())
      mostrar(
        { tipo: 'alarma', hora: new Date().toTimeString().slice(0, 5), pendientes, cursoDe: (t) => cu.find((c) => c.id === t.cursoId)?.nombre ?? '' },
        pendientes.length ? `Tienes ${pendientes.length} pendientes` : 'Así se verá tu alarma',
      )
    }
    window.addEventListener('astia:probar-alarma', probar)
    return () => window.removeEventListener('astia:probar-alarma', probar)
  }, [mostrar])

  if (!aviso) return null
  return (
    <PantallaAviso
      aviso={aviso}
      alCerrar={() => setAviso(null)}
      alPosponer={() => {
        pospuesto.current = { hasta: Date.now() + 10 * 60_000, aviso }
        setAviso(null)
      }}
      alVerPendientes={() => {
        setAviso(null)
        if (aviso.tipo === 'simple') {
          cambiar({ modo: aviso.modo })
          window.location.hash = aviso.destino
        } else window.location.hash = IR_A_PENDIENTES
      }}
    />
  )
}
