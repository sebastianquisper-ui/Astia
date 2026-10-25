import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/figtree'
import './estilos/tokens.css'
import './estilos/app.css'
import App from './App'
import { AvisoProvider } from './ui/Aviso'
import { AjustesProvider } from './ajustes/AjustesProvider'
import { DatosProvider } from './datos/DatosProvider'
import { EvidenciaProvider } from './formularios/Evidencia'
import { CuentaProvider } from './cuenta/CuentaProvider'
import { PuertaCuenta } from './cuenta/PuertaCuenta'
import { intentarMusica } from './sonidos/musica'

// En el iPhone el audio solo suena después de tocar la pantalla: el primer toque lo deja listo
// (y es también cuando empieza la música de fondo)
window.addEventListener('pointerdown', intentarMusica, { once: true, passive: true })

// Registra el service worker: es lo que permite instalar la app y abrirla sin internet
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AvisoProvider>
      <AjustesProvider>
        <CuentaProvider>
          <PuertaCuenta>
            <DatosProvider>
              <EvidenciaProvider>
                <App />
              </EvidenciaProvider>
            </DatosProvider>
          </PuertaCuenta>
        </CuentaProvider>
      </AjustesProvider>
    </AvisoProvider>
  </StrictMode>,
)
