import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.1.80',
      'loca.lt',
      '.loca.lt',
      '*.loca.lt',
    ],
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
