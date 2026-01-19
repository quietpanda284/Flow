
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0) so phone can connect to React
    port: 5174,
    allowedHosts: true, // Bypass host header check for tunneling (ngrok)
    proxy: {
      '/api': {
        // Point to localhost. Since Vite runs on the laptop, it can reach the backend 
        // on localhost:3006 even if the phone cannot.
        target: 'http://127.0.0.1:3006', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
