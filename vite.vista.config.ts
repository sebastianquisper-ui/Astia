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
  // En la vista previa (página alojada) los navegadores no permiten descargar archivos
  define: { 'import.meta.env.VITE_VISTA': JSON.stringify('1') },
  build: { outDir: 'dist-vista', emptyOutDir: true, assetsInlineLimit: 100_000_000 },
})
