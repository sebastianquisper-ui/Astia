import { defineConfig, devices } from '@playwright/test'

// Prueba de la sincronización con la nube de verdad: la app se construye apuntando a los emuladores de Firebase
// (Auth y Firestore locales) y varios "teléfonos" (contextos del navegador) usan la misma cuenta. Uso: npm run test:nube
export default defineConfig({
  testDir: 'e2e-nube',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:4174',
    ...devices['iPhone 14'],
    defaultBrowserType: 'chromium',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'VITE_EMULADORES=1 npx vite build --outDir dist-nube --emptyOutDir && npx vite preview --outDir dist-nube --port 4174',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
