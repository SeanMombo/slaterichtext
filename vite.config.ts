import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    host: true, // This allows connections from any host
    port: 5173,
    strictPort: true, // This ensures Vite uses exactly port 5173
    allowedHosts: [
      '*',
      'd095-136-24-102-225.ngrok-free.app',
      '.ngrok-free.app' // This allows all ngrok-free.app subdomains
    ],
  },
})
