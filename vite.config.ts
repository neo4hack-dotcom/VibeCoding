import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Configuration du proxy pour contourner les erreurs CORS avec Ollama
    // Utilisation de 127.0.0.1 au lieu de localhost pour éviter les problèmes de résolution IPv6 avec Node
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});