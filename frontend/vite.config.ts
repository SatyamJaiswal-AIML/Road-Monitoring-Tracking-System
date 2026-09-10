import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),  // self-signed HTTPS so camera/mic getUserMedia works
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      protocol: 'wss',
      host: 'localhost',
      port: 5173,
    },
    // ─── Proxy all /api/* calls through Vite so they stay on HTTPS ────────
    // This solves Mixed Content: frontend (https) calling backend (http)
    // The browser talks to https://localhost:5173/api/*
    // Vite server-side forwards to http://localhost:8000/api/* (no browser restriction)
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },

  },
})
