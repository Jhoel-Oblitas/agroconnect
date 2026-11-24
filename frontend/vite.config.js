import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'images/farm-bg.jpg'],
      manifest: {
        name: 'AgroConnect — CRM Agrícola Modular',
        short_name: 'AgroConnect',
        description: 'Gestión modular de finca pequeña: campo, trazabilidad QR, inventarios, ventas y agente IA por WhatsApp.',
        theme_color: '#5A9342',
        background_color: '#F5F7F6',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'es',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'agroconnect-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'happy-dom'
  }
});
