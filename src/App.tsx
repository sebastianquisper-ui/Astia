import { useCallback, useEffect, useState } from 'react'
import { hashDe, leerRuta, PESTANAS_FINANZAS, type Pestana, type Ruta } from './lib/ruta'
import { Estrella, Icono } from './ui/Icono'
import { BotonMusica } from './ui/BotonMusica'
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
import { Bienvenida } from './ui/Bienvenida'
import { BloqueoProvider, useBloqueo } from './finanzas/Bloqueo'
import { FinanzasProvider, useFinanzasOpcional, type Finanzas } from './finanzas/FinanzasProvider'
import { FondoDinero } from './finanzas/FondoDinero'
import { Finanstia } from './finanzas/Finanstia'
import { useCuenta } from './cuenta/CuentaProvider'

export default function App() {
  return (
    <BloqueoProvider>
      <Estructura />
    </BloqueoProvider>
  )
}

function Estructura() {
  const { ajustes, cambiar } = useAjustes()
  const { abierto } = useBloqueo()
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

  // Al cambiar de modo la pestaña puede no existir en el otro: te quedamos en su "gemela"
  const cambiarModo = (m: Modo) => {
    cambiar({ modo: m })
    let gemela: Pestana = ruta.pestana
    if (m === 'finanzas') gemela = ruta.pestana === 'mas' ? 'mas' : 'hoy'
    else if (PESTANAS_FINANZAS.includes(ruta.pestana)) gemela = 'hoy'
    else if (ruta.pestana === 'cursos' && m === 'personal') gemela = 'habitos'
    else if (ruta.pestana === 'habitos' && m === 'academico') gemela = 'cursos'
    ir({ pestana: gemela, sub: '' })
  }

  const finanzas = ajustes.modo === 'finanzas'
  // Fuera de Finanstia no hay pestañas de Finanstia (ni al revés)
  const pestana: Pestana = finanzas ? (['hoy', 'movimientos', 'presupuesto', 'metas', 'mas'].includes(ruta.pestana) ? ruta.pestana : 'hoy') : PESTANAS_FINANZAS.includes(ruta.pestana) ? 'hoy' : ruta.pestana

  const irAFinanzas = useCallback<Finanzas['irA']>((p) => ir({ pestana: p, sub: '' }), [ir])

  const cuerpo = (
    <Cuerpo ruta={{ pestana, sub: ruta.sub }} elegirPestana={elegirPestana} abrirMas={(sub) => ir({ pestana: 'mas', sub })} cambiarModo={cambiarModo} irAMas={() => ir({ pestana: 'mas', sub: '' })} />
  )
  return finanzas && abierto ? <FinanzasProvider irA={irAFinanzas}>{cuerpo}</FinanzasProvider> : cuerpo
}

function Cuerpo({ ruta, elegirPestana, abrirMas, cambiarModo, irAMas }: { ruta: Ruta; elegirPestana: (p: Pestana) => void; abrirMas: (sub: string) => void; cambiarModo: (m: Modo) => void; irAMas: () => void }) {
  const { ajustes } = useAjustes()
  const { abierto } = useBloqueo()
  const { local } = useCuenta()
  const f = useFinanzasOpcional()
  const finanzas = ajustes.modo === 'finanzas'

  return (
    <>
      {finanzas ? <FondoDinero /> : <Cielo />}
      <DescansoVista />
      <Bienvenida />
      <div className="app">
        <header className="cabecera">
          <div className="marca">
            <Estrella />
            {finanzas ? 'Finanstia' : 'Astia'}
          </div>
          {finanzas ? (
            <div className="cabecera-botones">
              <BotonMusica />
              {f && (
                <button className="icono-btn" onClick={f.alternarMontos} aria-label={f.montosOcultos ? 'Mostrar montos' : 'Ocultar montos'} aria-pressed={f.montosOcultos}>
                  <Icono nombre={f.montosOcultos ? 'ojoOff' : 'ojo'} tam={20} />
                </button>
              )}
              {abierto && (
                <button className="icono-btn" onClick={irAMas} aria-label="Más opciones de Finanstia">
                  <Icono nombre="opciones" tam={20} />
                </button>
              )}
            </div>
          ) : (
            <div className="cabecera-botones">
              {ajustes.datosEjemplo ? (
                <button className="estado" onClick={() => abrirMas('ajustes')} aria-label="Datos de ejemplo. Toca para cargar los tuyos en Ajustes">
                  <i /> Datos de ejemplo
                </button>
              ) : (
                <div className="estado" title="Tus datos de estudios están en este teléfono">
                  <i /> Solo en este teléfono
                </div>
              )}
              <BotonMusica />
            </div>
          )}
        </header>
        <SelectorModo modo={ajustes.modo} alCambiar={cambiarModo} />
        {finanzas && local && abierto && <p className="fz-vista-previa">Vista previa: sin cuenta, con datos que se guardan solo en este navegador.</p>}
        <main>
          {finanzas ? (
            <Finanstia pestana={ruta.pestana} sub={ruta.sub} alAbrirMas={abrirMas} />
          ) : (
            <>
              {ruta.pestana === 'hoy' && <Hoy />}
              {ruta.pestana === 'semana' && <Semana />}
              {ruta.pestana === 'cursos' && <Cursos />}
              {ruta.pestana === 'habitos' && <Habitos />}
              {ruta.pestana === 'tareas' && <Tareas />}
              {ruta.pestana === 'mas' && <Mas sub={ruta.sub} alAbrir={abrirMas} />}
            </>
          )}
        </main>
      </div>
      {(!finanzas || abierto) && <NavInferior activa={ruta.pestana} modo={ajustes.modo} alElegir={elegirPestana} alRegistrar={f ? () => f.abrirFormulario() : undefined} />}
    </>
  )
}

