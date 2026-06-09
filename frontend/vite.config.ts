import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 38472,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:38471',
        changeOrigin: true,
      },
    },
  },
});
