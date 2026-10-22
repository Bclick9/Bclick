import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const phoneCertPath = fileURLToPath(new URL('./.local-certs/phone-cert.pem', import.meta.url))
const phoneKeyPath = fileURLToPath(new URL('./.local-certs/phone-key.pem', import.meta.url))
const phoneHttpsReady = existsSync(phoneCertPath) && existsSync(phoneKeyPath)
const localHttps = phoneHttpsReady
  ? { cert: readFileSync(phoneCertPath), key: readFileSync(phoneKeyPath) }
  : undefined

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    ...(localHttps ? { https: localHttps } : {}),
    proxy: {
      // Same-origin browser requests preserve Secure __Host- cookies and exact-Origin checks.
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    ...(localHttps ? { https: localHttps } : {}),
  },
})
