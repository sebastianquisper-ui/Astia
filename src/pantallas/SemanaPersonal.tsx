import { useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { INICIALES_DIAS, MESES, addDays, lunesDe, ymd } from '../lib/fechas'
import { semanaDe, vecesEnSemana } from '../lib/habitos'
import { apartadoDe } from '../lib/apartados'
import { Icono } from '../ui/Icono'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

/** Semana en modo Mi Órbita: una cuadrícula de hábitos (filas) por día (columnas). Toca una casilla para marcarla. */
export function SemanaPersonal() {
  const { habitos, rutinas, alternarHabito } = useDatos()
  const ahora = useAhora()
  const [desfase, setDesfase] = useState(0)
  const lunes = addDays(lunesDe(ahora), desfase * 7)
  const domingo = addDays(lunes, 6)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const hoyYmd = ymd(ahora)
  const rango = lunes.getMonth() === domingo.getMonth() ? `${lunes.getDate()} al ${domingo.getDate()} ${MESES[domingo.getMonth()]}` : `${lunes.getDate()} ${MESES[lunes.getMonth()]} al ${domingo.getDate()} ${MESES[domingo.getMonth()]}`

  return (
    <section className="pantalla">
      <h1 className="titulo">Semana</h1>
      <div className="semana-nav">
        <button className="icono-btn" onClick={() => setDesfase((d) => d - 1)} aria-label="Semana anterior"><Icono nombre="izquierda" tam={18} /></button>
        <div>
          <b>{desfase === 0 ? 'Esta semana' : rango}</b>
          {desfase === 0 && <span className="sub"> · {rango}</span>}
        </div>
        <button className="icono-btn" onClick={() => setDesfase((d) => d + 1)} aria-label="Semana siguiente"><Icono nombre="derecha" tam={18} /></button>
      </div>

      {habitos.length === 0 && rutinas.length === 0 ? (
        <div className="seccion">
          <Vacio titulo="Semana sin hábitos" texto="Crea tus hábitos en la pestaña Hábitos y verás aquí tu semana completa." />
        </div>
      ) : (
        <div className="seccion">
          <div className="cuadricula" role="table" aria-label="Hábitos de la semana">
            <div className="cuadricula-fila cabecera" role="row">
              <span />
              {dias.map((d, i) => (
                <span key={i} className={'cuadricula-dia' + (ymd(d) === hoyYmd ? ' hoy' : '')} role="columnheader">
                  {INICIALES_DIAS[i]}
                  <small>{d.getDate()}</small>
                </span>
              ))}
            </div>
            {habitos.map((h) => {
              const estados = semanaDe(h, ahora, lunes)
              return (
                <div key={h.id} className="cuadricula-fila" role="row" style={{ ['--color' as string]: h.color }}>
                  <span className="cuadricula-nombre" role="rowheader">
                    {h.nombre}
                    {h.frecuencia.tipo === 'semanal' && <small>{vecesEnSemana(h, lunes)} de {h.frecuencia.veces}</small>}
                  </span>
                  {estados.map((d, i) => (
                    <button
                      key={i}
                      className={'cuadricula-celda ' + d.estado}
                      disabled={d.estado === 'futuro'}
                      aria-pressed={d.estado === 'hecho'}
                      aria-label={`${h.nombre}, ${d.fecha.getDate()} de ${MESES[d.fecha.getMonth()]}${d.estado === 'hecho' ? ', cumplido' : ''}`}
                      onClick={() => alternarHabito(h.id, ymd(d.fecha))}
                    >
                      {d.estado === 'hecho' && <Icono nombre="check" tam={14} />}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {rutinas.length > 0 && (
            <>
              <h2 className="titulo" style={{ marginTop: 24 }}>Rutinas</h2>
              <div className="cuadricula" role="table" aria-label="Rutinas de la semana">
                {rutinas.map((r) => {
                  const ap = apartadoDe(r.categoria)
                  return (
                    <div key={r.id} className="cuadricula-fila" role="row" style={{ ['--color' as string]: ap.color }}>
                      <span className="cuadricula-nombre" role="rowheader">{r.nombre}</span>
                      {dias.map((d, i) => (
                        <span key={i} className={'cuadricula-celda solo' + (r.registro.includes(ymd(d)) ? ' hecho' : '')} aria-label={r.registro.includes(ymd(d)) ? 'Cumplida' : 'Sin cumplir'}>
                          {r.registro.includes(ymd(d)) && <Icono nombre="check" tam={14} />}
                        </span>
                      ))}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
