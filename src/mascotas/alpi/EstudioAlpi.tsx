import { useState } from 'react'
import { Icono } from '../../ui/Icono'
import { Alpi3D } from './Alpi3D'
import { ANIMACIONES_ALPI, EXPRESIONES_ALPI, NIVELES_ALPI, PALETA_ALPI, type AnimacionAlpi, type ExpresionAlpi, type NivelAlpi } from './datos'

/** Pantalla para probar a Alpi: su evolución (niveles 1 a 4), sus expresiones y sus animaciones. */
export default function EstudioAlpi({ alVolver, nivelInicial = 1 }: { alVolver: () => void; nivelInicial?: NivelAlpi }) {
  const [nivel, setNivel] = useState<NivelAlpi>(nivelInicial)
  const [expresion, setExpresion] = useState<ExpresionAlpi>('feliz')
  const [animacion, setAnimacion] = useState<AnimacionAlpi>('reposo')
  const datos = NIVELES_ALPI[nivel - 1]

  // Algunas combinaciones van juntas: estudiar pone cara de concentrada y descansar, de dormida.
  const animar = (a: AnimacionAlpi) => {
    setAnimacion(a)
    if (a === 'estudiando') setExpresion('concentrada')
    else if (a === 'descansando') setExpresion('dormida')
    else if (a === 'celebrar' || a === 'saltar') setExpresion('emocionada')
    else if (expresion === 'dormida' || expresion === 'concentrada') setExpresion('feliz')
  }

  return (
    <section className="pantalla estudio-alpi">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Mi mascota
      </button>
      <h1 className="titulo">Alpi en 3D</h1>
      <p className="sub">Prueba su evolución, sus expresiones y sus movimientos. Arrastra para girarla.</p>

      <div className="escenario-alpi" style={{ background: `linear-gradient(180deg, ${datos.fondo[0]}, ${datos.fondo[1]})`, ['--acento-alpi' as string]: datos.acento }}>
        <div className="escenario-titulo">
          <b>Nivel {nivel}</b>
          <span>{datos.nombre}</span>
        </div>
        <Alpi3D nivel={nivel} expresion={expresion} animacion={animacion} girable efectos />
        <p className="escenario-lema">{datos.lema}</p>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">Evolución</h2>
        <div className="niveles-alpi" role="group" aria-label="Nivel">
          {NIVELES_ALPI.map((n) => (
            <button key={n.nivel} aria-pressed={nivel === n.nivel} onClick={() => setNivel(n.nivel)} style={{ ['--acento-alpi' as string]: n.acento, ['--fondo-alpi' as string]: n.fondo[0] }}>
              <b>Nivel {n.nivel}</b>
              <span>{n.nombre}</span>
            </button>
          ))}
        </div>
        <p className="nota-alpi">{datos.accesorios}.</p>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">Expresiones</h2>
        <div className="opciones-alpi" role="group" aria-label="Expresión">
          {EXPRESIONES_ALPI.map((e) => (
            <button key={e.id} aria-pressed={expresion === e.id} onClick={() => setExpresion(e.id)}>
              <b>{e.nombre}</b>
              <span>{e.cuando}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">Animaciones</h2>
        <div className="opciones-alpi compactas" role="group" aria-label="Animación">
          {ANIMACIONES_ALPI.map((a) => (
            <button key={a.id} aria-pressed={animacion === a.id} onClick={() => animar(a.id)}>
              <b>{a.nombre}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="seccion">
        <h2 className="titulo-seccion">Paleta de colores</h2>
        <div className="paleta-alpi">
          {PALETA_ALPI.map((c) => (
            <span key={c.nombre}>
              <i style={{ background: c.color }} />
              {c.nombre}
            </span>
          ))}
        </div>
        <p className="nota-alpi">En la app, Alpi cambia sola: duerme de noche, se sorprende si algo vence, te saluda cuando cumples y salta cuando la tocas.</p>
      </div>
    </section>
  )
}
