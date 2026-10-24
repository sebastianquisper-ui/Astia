import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

// Versión de vista previa: todo (código, estilos, tipografías) dentro de UN solo archivo HTML.
export default defineConfig({
  plugins: [
    react(),
    // Alpi trae su propia página como texto (con etiquetas <script>): dentro de un solo HTML hay que
    // escribir "<\/script" para que el navegador no crea que ahí termina el código de la app.
    {
      name: 'escapar-script',
      generateBundle(_, bundle) {
        for (const archivo of Object.values(bundle)) if (archivo.type === 'chunk') archivo.code = archivo.code.replace(/<\/script/gi, '<\\/script')
      },
    },
    viteSingleFile(),
  ],
  resolve: {
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./scripts/sin-pwa.ts', import.meta.url)) },
  },
  // En la vista previa (página alojada) los navegadores no permiten descargar archivos
  define: { 'import.meta.env.VITE_VISTA': JSON.stringify('1') },
  build: { outDir: 'dist-vista', emptyOutDir: true, assetsInlineLimit: 100_000_000 },
})
