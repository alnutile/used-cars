import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    // Allow Railway's public domains (and any *.up.railway.app subdomain)
    allowedHosts: ['.up.railway.app'],
  },
})
