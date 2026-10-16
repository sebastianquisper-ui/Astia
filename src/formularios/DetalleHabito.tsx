import { useState } from 'react'
import type { Habito } from '../dominio/tipos'
import { apartadoDe } from '../lib/apartados'
import { INICIALES_DIAS, MESES_LARGOS, addDays, indiceDia, ymd } from '../lib/fechas'
import { cumplido, cumplimiento30, mejorRacha, rachaDe, textoFrecuencia } from '../lib/habitos'
import { Icono } from '../ui/Icono'

/** El detalle de un hábito: estadísticas y el calendario del mes (toca un día para marcarlo o desmarcarlo). */
export function DetalleHabito({ habito, hoy, alAlternarFecha, alEditar }: { habito: Habito; hoy: Date; alAlternarFecha: (fecha: string) => void; alEditar: () => void }) {
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const racha = rachaDe(habito, hoy)
  const mejor = mejorRacha(habito, hoy)
  const ap = apartadoDe(habito.categoria)

  const primerDia = indiceDia(mes) // casillas vacías antes del día 1
  const diasDelMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const hoyYmd = ymd(hoy)
  const esMesActual = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth()
  const cambiarMes = (delta: number) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <div style={{ ['--color' as string]: habito.color }}>
      <p className="sub con-icono">
        <Icono nombre={ap.icono} tam={14} />
        {ap.nombre} · {textoFrecuencia(habito.frecuencia)}
      </p>
      {habito.minimo && <p className="habito-minimo" style={{ marginTop: 6 }}>Mínimo: {habito.minimo}</p>}

      <div className="estadisticas">
        <div><b>{racha.n}</b><span>racha actual ({racha.unidad})</span></div>
        <div><b>{mejor.n}</b><span>mejor racha ({mejor.unidad})</span></div>
        <div><b>{cumplimiento30(habito, hoy)}%</b><span>últimos 30 días</span></div>
      </div>

      <div className="mes-cab">
        <button className="icono-btn" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><Icono nombre="izquierda" tam={18} /></button>
        <b>{MESES_LARGOS[mes.getMonth()]} {mes.getFullYear()}</b>
        <button className="icono-btn" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" disabled={esMesActual}><Icono nombre="derecha" tam={18} /></button>
      </div>
      <div className="mes-grid" role="group" aria-label="Calendario del mes">
        {INICIALES_DIAS.map((d, i) => (
          <span key={i} className="mes-dia-nombre">{d}</span>
        ))}
        {Array.from({ length: primerDia }, (_, i) => (
          <span key={'v' + i} />
        ))}
        {Array.from({ length: diasDelMes }, (_, i) => {
          const fecha = addDays(mes, i)
          const k = ymd(fecha)
          const hecho = cumplido(habito, k)
          const futuro = k > hoyYmd
          return (
            <button key={k} className={'mes-celda' + (hecho ? ' hecho' : '') + (k === hoyYmd ? ' hoy' : '')} disabled={futuro} aria-pressed={hecho} aria-label={`${i + 1} de ${MESES_LARGOS[mes.getMonth()]}${hecho ? ', cumplido' : ''}`} onClick={() => alAlternarFecha(k)}>
              {i + 1}
            </button>
          )
        })}
      </div>
      <p className="nota">Toca un día para marcarlo o desmarcarlo. Sirve para corregir un olvido.</p>

      <div className="acciones">
        <button className="btn suave" onClick={alEditar}>Editar hábito</button>
      </div>
    </div>
  )
}
