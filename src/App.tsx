import { useCallback, useEffect, useState } from 'react'
import { hashDe, leerRuta, type Pestana, type Ruta } from './lib/ruta'
import { Estrella } from './ui/Icono'
import { NavInferior } from './ui/NavInferior'
import { Hoy } from './pantallas/Hoy'
import { Cursos, Semana, Tareas } from './pantallas/Simples'
import { Mas } from './pantallas/Mas'

export default function App() {
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

  return (
    <>
      <div className="app">
        <header className="cabecera">
          <div className="marca">
            <Estrella />
            Astia
          </div>
          <div className="estado" title="La nube se conecta en la fase 2">
            <i /> Solo en este teléfono
          </div>
        </header>
        <main>
          {ruta.pestana === 'hoy' && <Hoy />}
          {ruta.pestana === 'semana' && <Semana />}
          {ruta.pestana === 'cursos' && <Cursos />}
          {ruta.pestana === 'tareas' && <Tareas />}
          {ruta.pestana === 'mas' && <Mas sub={ruta.sub} alAbrir={(sub) => ir({ pestana: 'mas', sub })} />}
        </main>
      </div>
      <NavInferior activa={ruta.pestana} alElegir={elegirPestana} />
    </>
  )
}
