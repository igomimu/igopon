import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { version } from './package.json';

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(version),
    // VITE_ prefixed variables are automatically exposed to import.meta.env
  },
  appType: 'spa',
  base: process.env.VITE_BASE_PATH || '/igopon/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'maskable-icon-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: {
        name: 'igopon',
        short_name: 'igopon',
        description: 'Drop stones. Surround them. Watch them vanish!',
        lang: 'en',
        categories: ['games', 'puzzle'],
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    sourcemap: true
  }
});
