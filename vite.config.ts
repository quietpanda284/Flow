
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    port: 5174, // Updated port
    allowedHosts: true, // Bypass host header check for tunneling (ngrok)
  }
});
