import { BotonVestidor } from '../mascotas/alpi/Vestidor'
import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { AREAS_XP, MASCOTAS, estadoDe, umbralesDe, type Mascota, type MascotaElegida } from '../lib/mascotas'
import { MascotaMini, MascotaVista } from '../mascotas/MascotaVista'
import { useMascota } from '../mascotas/useMascota'
import { Avatar } from '../ui/Avatar'
import { useAviso } from '../ui/Aviso'
import { Hoja } from '../ui/Hoja'
import { Icono, type NombreIcono } from '../ui/Icono'

const ICONO_AREA: Record<string, NombreIcono> = { academico: 'tareas', personal: 'metas', habitos: 'habitos', cuidado: 'salud' }

/** Más → Mi mascota: tu compañero, su evolución, cómo ganar XP y la galería para elegir. */
export function Mascotas({ alVolver }: { alVolver: () => void }) {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const actual = useMascota()
  const [detalle, setDetalle] = useState<MascotaElegida | null>(null)
  const { xp, total, estado, mascota, semanas } = actual
  const elegida = detalle && detalle !== 'astia' ? MASCOTAS.find((m) => m.id === detalle) : undefined

  const elegir = (m: Mascota | 'astia') => {
    if (m === 'astia') cambiar({ mascota: 'astia' })
    else cambiar({ mascota: m.id, mascotaVista: { ...ajustes.mascotaVista, [m.id]: estadoDe(m, xp, semanas).indice } })
    setDetalle(null)
    avisar(m === 'astia' ? 'Astia, la estrella de siempre, es tu compañera.' : `${m.nombre} es ahora tu compañero.`)
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Mi mascota</h1>
      <p className="sub">Alpi evoluciona con lo que haces: tareas, hábitos, rutinas y cuidarte. Tócalo para que reaccione.</p>

      <div className="tarjeta mascota-actual">
        {mascota && estado ? (
          <>
            <MascotaVista mascota={mascota.id} etapa={estado.indice + 1} animo="seria" tam={168} />
            <h2 className="titulo">{mascota.nombre}</h2>
            <p className="sub">{mascota.apodo}</p>
            <p className="etapa-actual">Nivel {estado.indice + 1} de {estado.etapas} · {estado.nombreEtapa}</p>
            <div className="meter" role="progressbar" aria-label="Progreso a la siguiente etapa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(estado.progreso * 100)}>
              <i style={{ width: `${estado.progreso * 100}%` }} />
            </div>
            <p className="nota">
              {estado.bloqueo
                ? `Ya tienes el XP para evolucionar, pero falta equilibrio: suma XP ${estado.bloqueo === 'academico' ? 'académico' : 'de vida personal'} (al menos 15% del total).`
                : estado.xpSiguiente === null
                  ? 'Llegó a su última etapa. Sigue cumpliendo para mantenerlo feliz.'
                  : `${total} de ${estado.xpSiguiente} XP para la siguiente etapa.`}
            </p>
            {mascota.id === 'alpi' && <BotonVestidor className="enlace-mascotas ancho" />}
          </>
        ) : (
          <>
            <Avatar animo="seria" tam={150} />
            <h2 className="titulo">Astia</h2>
            <p className="sub">La estrella de siempre. No evoluciona: elige a una mascota para verla crecer.</p>
          </>
        )}
        <p className="xp-total"><b>{total}</b> XP en total</p>
      </div>

      <div className="seccion">
        <h2 className="titulo">Cómo ganas XP</h2>
        <div className="lista">
          {AREAS_XP.map((a) => (
            <div key={a.id} className="fila xp-fila">
              <span className="ico"><Icono nombre={ICONO_AREA[a.id]} tam={24} /></span>
              <span className="texto">
                <b>{a.nombre}</b>
                <span>{a.detalle}</span>
              </span>
              <span className="xp-valor">{xp[a.id]}</span>
            </div>
          ))}
        </div>
        <p className="nota">Con buen ritmo llegas al nivel máximo a la mitad de tu ciclo. Para pasar de la etapa 2 en adelante necesitas equilibrio: al menos 15% de tu XP de estudios y 15% de vida personal.</p>
      </div>

      <div className="seccion">
        <h2 className="titulo">Elige a tu compañero</h2>
        <div className="galeria">
          <button className={'mascota-card' + (ajustes.mascota === 'astia' ? ' elegida' : '')} onClick={() => setDetalle('astia')} aria-label="Astia, la estrella de siempre">
            <span className="mascota-mini astia" aria-hidden="true"><Avatar animo="seria" tam={64} /></span>
            <b>Astia</b>
            <span>La estrella de siempre</span>
          </button>
          {MASCOTAS.map((m) => {
            const e = estadoDe(m, xp, semanas)
            return (
              <button key={m.id} className={'mascota-card' + (ajustes.mascota === m.id ? ' elegida' : '')} onClick={() => setDetalle(m.id)} aria-label={`${m.nombre}, ${m.apodo}`}>
                <MascotaMini mascota={m.id} etapa={e.indice + 1} tam={96} />
                <b>{m.nombre}</b>
                <span>{m.apodo}</span>
                {ajustes.mascota === m.id && <em className="insignia">Tu compañero</em>}
              </button>
            )
          })}
        </div>
      </div>

      <Hoja titulo={elegida ? elegida.nombre : 'Astia'} abierta={detalle !== null} alCerrar={() => setDetalle(null)}>
        {detalle === 'astia' && (
          <div className="detalle-mascota">
            <Avatar animo="seria" tam={150} />
            <p className="sub">La estrella de siempre. Estricta, directa y sin excusas. No evoluciona.</p>
            <div className="acciones" style={{ width: '100%' }}>
              <button className="btn" disabled={ajustes.mascota === 'astia'} onClick={() => elegir('astia')}>{ajustes.mascota === 'astia' ? 'Es tu compañera' : 'Elegir a Astia'}</button>
            </div>
          </div>
        )}
        {elegida && <DetalleMascota mascota={elegida} esActual={ajustes.mascota === elegida.id} onElegir={() => elegir(elegida)} />}
      </Hoja>
    </section>
  )
}

function DetalleMascota({ mascota, esActual, onElegir }: { mascota: Mascota; esActual: boolean; onElegir: () => void }) {
  const { xp, semanas } = useMascota()
  const estado = estadoDe(mascota, xp, semanas)
  const umbrales = umbralesDe(mascota.etapas.length, semanas)
  return (
    <div className="detalle-mascota">
      <MascotaVista mascota={mascota.id} etapa={estado.indice + 1} animo="seria" tam={190} />
      <p className="sub apodo">{mascota.apodo}</p>
      <p className="descripcion">{mascota.descripcion}</p>
      <div className="etiquetas">
        {mascota.etiquetas.map((e) => (
          <span key={e} className="etiqueta-chip">{e}</span>
        ))}
      </div>

      <h3 className="titulo" style={{ marginTop: 22 }}>Evolución</h3>
      <ol className="evolucion">
        {mascota.etapas.map((nombre, i) => {
          const alcanzada = i <= estado.indice
          return (
            <li key={nombre} className={alcanzada ? 'alcanzada' : ''} aria-label={`Nivel ${i + 1}, ${nombre}${alcanzada ? '' : ', bloqueado'}`}>
              <MascotaMini mascota={mascota.id} etapa={i + 1} bloqueada={!alcanzada} tam={66} />
              {!alcanzada && <span className="candado"><Icono nombre="candado" tam={16} /></span>}
              <b>Nivel {i + 1}</b>
              <span>{alcanzada ? nombre : `${umbrales[i]} XP`}</span>
            </li>
          )
        })}
      </ol>

      <div className="acciones" style={{ width: '100%' }}>
        {mascota.id === 'alpi' && (
          <a className="btn suave probar-alpi" href="#/mas/alpi">
            Probar a Alpi en 3D
          </a>
        )}
        <button className="btn" disabled={esActual} onClick={onElegir}>{esActual ? 'Es tu compañero' : `Elegir a ${mascota.nombre}`}</button>
      </div>
    </div>
  )
}
