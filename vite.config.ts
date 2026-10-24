import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Colores de marca (los mismos del tema oscuro de la v1)
const FONDO = '#1F2230'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // La app se actualiza sola cuando publico una versión nueva
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Astia',
        short_name: 'Astia',
        description: 'Tu asistente personal contra la procrastinación.',
        lang: 'es-PE',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: FONDO,
        theme_color: FONDO,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo lo de la app queda guardado en el teléfono: abre sin internet
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'supabase/**/*.test.ts'],
  },
})
