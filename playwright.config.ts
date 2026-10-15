import { defineConfig, devices } from '@playwright/test'

// Pruebas de flujos completos en un navegador real, con tamaño de pantalla de iPhone.
// Usa el Chromium ya instalado en el entorno (no descarga nada).
export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['iPhone 14'],
    // El proyecto fija el navegador: Chromium con la pantalla del iPhone
    defaultBrowserType: 'chromium',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
