import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite acesso externo ao container
    port: 5173,
    strictPort: true, // Garante que use exatamente a 5173
    watch: {
      usePolling: true, // Necessário para Windows/Docker refletir mudanças de arquivo
    }
  }
})
