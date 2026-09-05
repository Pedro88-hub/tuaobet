import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages: https://<user>.github.io/tuaobet/
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: true, // Isso libera o acesso para 127.0.0.1 e localhost
    port: 5173, // Força a porta 5173
    watch: {
      usePolling: true, // Ajuda se o Windows não estiver detectando as mudanças nos arquivos
    }
  }
})