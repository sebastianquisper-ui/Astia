import type { ReactNode } from 'react'
import { Estrella } from '../ui/Icono'
import { Cielo } from '../ui/Cielo'
import { useCuenta } from './CuentaProvider'

/** Deja pasar solo con la sesión iniciada; mientras tanto muestra la carga o el acceso con Google. */
export function PuertaCuenta({ children }: { children: ReactNode }) {
  const { estado, error, entrando, entrar } = useCuenta()
  if (estado === 'dentro') return <>{children}</>
  return (
    <>
      <Cielo />
      <main className="acceso">
        <div className="acceso-marca">
          <Estrella />
          <h1>Astia</h1>
        </div>
        {estado === 'cargando' ? (
          <p className="acceso-texto" role="status">Abriendo…</p>
        ) : (
          <>
            <p className="acceso-texto">Tus estudios, tu vida y tu plata, con una sola cuenta.</p>
            <button className="btn acceso-boton" onClick={entrar} disabled={entrando}>
              {entrando ? 'Abriendo Google…' : 'Continuar con Google'}
            </button>
            {error && <p className="acceso-error" role="alert">{error}</p>}
            <p className="nota acceso-nota">Tus datos quedan protegidos con tu cuenta de Google. Nadie más puede verlos.</p>
          </>
        )}
      </main>
    </>
  )
}
