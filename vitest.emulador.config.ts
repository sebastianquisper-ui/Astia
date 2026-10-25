import { defineConfig } from 'vitest/config'

// Pruebas contra el emulador de Firestore (necesita Java): npm run test:firestore
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emulador.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
