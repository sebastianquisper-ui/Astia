import { useCallback, useEffect, useState } from 'react'
import { hashDe, leerRuta, type Pestana, type Ruta } from './lib/ruta'
import { Estrella } from './ui/Icono'
import { NavInferior } from './ui/NavInferior'
import { Hoy } from './pantallas/Hoy'
import { Semana } from './pantallas/Semana'
import { Habitos } from './pantallas/Habitos'
import { SelectorModo } from './ui/SelectorModo'
import { Cursos } from './pantallas/Cursos'
import { Tareas } from './pantallas/Tareas'
import { Cielo } from './ui/Cielo'
import { useAjustes, type Modo } from './ajustes/AjustesProvider'
import { Mas } from './pantallas/Mas'
import { DescansoVista } from './ui/DescansoVista'

export default function App() {
  const { ajustes, cambiar } = useAjustes()
  const [ruta, setRuta] = useState<Ruta>(() => leerRuta(window.location.hash))

  // Escucha el hash: así funciona el gesto "volver" del iPhone
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leerRuta(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const ir = useCallback((nueva: Ruta) => {
    window.location.hash = hashDe(nueva)
  }, [])

  const elegirPestana = (p: Pestana) => ir({ pestana: p, sub: '' })

  // Al cambiar de modo, la pestaña del medio cambia (Cursos <-> Hábitos): te quedamos en su "gemela"
  const cambiarModo = (m: Modo) => {
    cambiar({ modo: m })
    const gemela: Pestana = ruta.pestana === 'cursos' && m === 'personal' ? 'habitos' : ruta.pestana === 'habitos' && m === 'academico' ? 'cursos' : ruta.pestana
    ir({ pestana: gemela, sub: '' })
  }

  return (
    <>
      <Cielo />
      <DescansoVista />
      <div className="app">
        <header className="cabecera">
          <div className="marca">
            <Estrella />
            Astia
          </div>
          {ajustes.datosEjemplo ? (
            <button className="estado" onClick={() => ir({ pestana: 'mas', sub: 'ajustes' })} aria-label="Datos de ejemplo. Toca para cargar los tuyos en Ajustes">
              <i /> Datos de ejemplo
            </button>
          ) : (
            <div className="estado" title="La nube se conecta en la parte 2b">
              <i /> Solo en este teléfono
            </div>
          )}
        </header>
        <SelectorModo modo={ajustes.modo} alCambiar={cambiarModo} />
        <main>
          {ruta.pestana === 'hoy' && <Hoy />}
          {ruta.pestana === 'semana' && <Semana />}
          {ruta.pestana === 'cursos' && <Cursos />}
          {ruta.pestana === 'habitos' && <Habitos />}
          {ruta.pestana === 'tareas' && <Tareas />}
          {ruta.pestana === 'mas' && <Mas sub={ruta.sub} alAbrir={(sub) => ir({ pestana: 'mas', sub })} />}
        </main>
      </div>
      <NavInferior activa={ruta.pestana} modo={ajustes.modo} alElegir={elegirPestana} />
    </>
  )
}
