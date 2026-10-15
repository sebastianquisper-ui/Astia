import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

// Versión de vista previa: todo (código, estilos, tipografías) dentro de UN solo archivo HTML.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./scripts/sin-pwa.ts', import.meta.url)) },
  },
  build: { outDir: 'dist-vista', emptyOutDir: true, assetsInlineLimit: 100_000_000 },
})
