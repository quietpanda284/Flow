
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // IMPORTANT: Relative paths for Electron
  server: {
    host: true, 
    port: 3000, 
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3006', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
});