import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    strictPort: true,
    watch: { usePolling: true },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_INTERNAL_URL || 'http://backend:3001',
        changeOrigin: true
      }
    }
  }
})