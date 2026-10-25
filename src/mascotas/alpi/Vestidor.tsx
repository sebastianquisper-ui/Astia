import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Hoja } from '../../ui/Hoja'
import { Icono } from '../../ui/Icono'
import { Rig } from '../rig/Rig'
import { ACCESORIOS_ALPI, type ExpresionAlpi, type NivelAlpi } from './datos'
import { useVestidor } from './useVestidor'
import { useAlpi3D } from './useAlpi3D'

const AlpiIframe = lazy(() => import('./AlpiIframe'))
const NOMBRES = ['Alpaca bebé', 'Exploradora', 'Guardiana', 'Legendaria']

/** Lo que necesita el vestidor, sea el de estudios o el de Finanstia (cada uno tiene su Alpi). */
export interface EstadoVestidor {
  alcanzado: NivelAlpi
  nivel: NivelAlpi
  accesorios: Record<string, boolean>
  desbloqueado: boolean
  expresion?: ExpresionAlpi
  elegirNivel: (n: number) => void
  alternarAccesorio: (id: string) => void
  restablecer: () => void
}

/** Botón para abrir el vestidor (con candado mientras te quede algo pendiente hoy). */
export function BotonVestidor({ className = 'enlace-mascotas' }: { className?: string }) {
  const v = useVestidor()
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button className={className + (v.desbloqueado ? '' : ' bloqueado')} onClick={() => setAbierto(true)}>
        <span className="vestidor-icono" aria-hidden="true">
          <Icono nombre={v.desbloqueado ? 'mascota' : 'candado'} tam={22} />
        </span>
        <span>
          <b>Vestir a Alpi</b>
          <br />
          {v.desbloqueado ? 'Quítale ropa o vuelve a un nivel anterior' : `Se abre al cumplir lo de hoy (te faltan ${v.faltan})`}
        </span>
        <span className="enlace-mascotas-flecha" aria-hidden="true">›</span>
      </button>
      <Vestidor abierto={abierto} alCerrar={() => setAbierto(false)} />
    </>
  )
}

export function Vestidor({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const v = useVestidor()
  return (
    <VestidorHoja
      v={v}
      abierto={abierto}
      alCerrar={alCerrar}
      bloqueado={
        <>
          <p className="sub">
            Primero cumples, después juegas. Te {v.faltan === 1 ? 'falta 1 tarea' : `faltan ${v.faltan} tareas`} de hoy. Entrégalas con su evidencia y te dejo vestir a Alpi.
          </p>
          <button className="btn" onClick={() => (alCerrar(), (window.location.hash = '#/tareas'))}>Ver mis tareas</button>
        </>
      }
    />
  )
}

/** La hoja del vestidor: nivel y ropa. `bloqueado` es lo que se muestra mientras todavía no toca jugar. */
export function VestidorHoja({ v, abierto, alCerrar, bloqueado }: { v: EstadoVestidor; abierto: boolean; alCerrar: () => void; bloqueado: ReactNode }) {
  const en3d = useAlpi3D()
  const deEsteNivel = ACCESORIOS_ALPI.filter((a) => a.niveles.includes(v.nivel))
  return (
    <Hoja titulo="Vestidor de Alpi" abierta={abierto} alCerrar={alCerrar}>
      {!v.desbloqueado ? (
        <div className="vestidor">{bloqueado}</div>
      ) : (
        <div className="vestidor">
          <div className="vestidor-vista">
            {en3d ? (
              <Suspense fallback={null}>
                <AlpiIframe nivel={v.nivel} expresion={v.expresion ?? 'feliz'} accesorios={v.accesorios} />
              </Suspense>
            ) : (
              <Rig mascota="alpi" etapa={v.nivel} animo="contenta" />
            )}
          </div>
          <h3 className="titulo">Nivel</h3>
          <p className="nota">Puedes volver a un nivel anterior. Los que aún no alcanzas se abren con XP.</p>
          <div className="vestidor-niveles" role="group" aria-label="Nivel de Alpi">
            {([1, 2, 3, 4] as NivelAlpi[]).map((n) => (
              <button key={n} aria-pressed={v.nivel === n} disabled={n > v.alcanzado} onClick={() => v.elegirNivel(n)}>
                <b>Nivel {n}</b>
                <span>{n > v.alcanzado ? 'Bloqueado' : NOMBRES[n - 1]}</span>
              </button>
            ))}
          </div>
          <h3 className="titulo">Ropa y accesorios</h3>
          {deEsteNivel.length ? (
            <div className="vestidor-accesorios" role="group" aria-label="Ropa y accesorios">
              {deEsteNivel.map((a) => (
                <button key={a.id} aria-pressed={!!v.accesorios[a.id]} onClick={() => v.alternarAccesorio(a.id)}>
                  {a.nombre}
                </button>
              ))}
            </div>
          ) : (
            <p className="nota">En el nivel 1 Alpi solo lleva su bufanda.</p>
          )}
          <div className="acciones">
            <button className="btn suave" onClick={v.restablecer}>Como venía</button>
            <button className="btn" onClick={alCerrar}>Listo</button>
          </div>
        </div>
      )}
    </Hoja>
  )
}
