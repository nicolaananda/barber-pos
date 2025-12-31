import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'StayCool POS',
        short_name: 'StayCool',
        description: 'Professional Barber POS System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'landscape',
        icons: [
          {
            src: '/logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: '/logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        presentasi: path.resolve(__dirname, 'presentasi/index.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 7781,
    allowedHosts: [
      'cukur.nicola.id',
      'localhost',
      '.nicola.id'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
