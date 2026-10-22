import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  '/api': {
    // Keep the browser Origin and same-origin Secure __Host- cookies intact.
    target: 'http://127.0.0.1:3000',
    changeOrigin: false,
  },
}

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5174, proxy: apiProxy },
  preview: { host: '0.0.0.0', port: 4174, proxy: apiProxy },
})
