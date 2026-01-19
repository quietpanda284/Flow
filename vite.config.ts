
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    port: 5174,
    allowedHosts: true, // Bypass host header check for tunneling (ngrok)
    proxy: {
      '/api': {
        target: 'http://192.168.1.11:3006',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
