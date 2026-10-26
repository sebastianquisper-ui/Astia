import { useAjustes } from '../ajustes/AjustesProvider'
import { HORAS_RECOMENDADAS, horasEntre, mensajeDeSueno, promedio7, textoDuracion, ultimaNoche } from '../lib/sueno'
import { useSueno } from '../lib/useSueno'
import { useAhora } from './useAhora'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

/** Control de sueño de Mi Órbita: "Me voy a dormir" / "Ya desperté" y cuánto dormiste. */
export function TarjetaSueno() {
  const { ajustes } = useAjustes()
  const ahora = useAhora()
  const { registros, durmiendo, olvidado, dormir, despertar, descartar } = useSueno(ahora)
  const noche = ultimaNoche(registros, ahora)
  const promedio = promedio7(registros, ahora)

  return (
    <section className="seccion tarjeta-sueno" aria-label="Control de sueño">
      <h2 className="titulo">Sueño</h2>
      {durmiendo ? (
        <>
          <p className="nota">Durmiendo desde las {hora(durmiendo.durmio)} · {textoDuracion(horasEntre(durmiendo.durmio, ahora.toISOString()))}</p>
          <button className="btn" style={{ width: '100%' }} onClick={despertar}>Ya desperté</button>
        </>
      ) : olvidado ? (
        <>
          <p className="nota">Te dormiste a las {hora(olvidado.durmio)} y no marcaste que despertaste. ¿Quieres descartar ese registro?</p>
          <button className="btn suave" style={{ width: '100%' }} onClick={descartar}>Descartar</button>
        </>
      ) : (
        <>
          {noche !== null ? <p className="nota">{mensajeDeSueno(noche, ajustes.nombre)}</p> : <p className="nota">Toca el botón cuando te vayas a dormir y otra vez al despertar: Astia cuenta tus horas ({HORAS_RECOMENDADAS} h o más es lo recomendado para adultos).</p>}
          {promedio !== null && <p className="nota">Tu promedio de los últimos días: {textoDuracion(promedio)}.</p>}
          <button className="btn" style={{ width: '100%' }} onClick={dormir}>Me voy a dormir</button>
        </>
      )}
    </section>
  )
}
