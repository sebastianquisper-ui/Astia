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

// Registra el service worker: es lo que permite instalar la app y abrirla sin internet
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AvisoProvider>
      <AjustesProvider>
        <DatosProvider>
          <EvidenciaProvider>
            <App />
          </EvidenciaProvider>
        </DatosProvider>
      </AjustesProvider>
    </AvisoProvider>
  </StrictMode>,
)
