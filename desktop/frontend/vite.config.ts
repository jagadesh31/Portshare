import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  for (const name of ['VITE_PORTSHARE_API_BASE', 'VITE_PORTSHARE_ROOT_DOMAIN']) {
    if (!env[name]?.trim()) {
      throw new Error(`Missing required environment variable: ${name}`)
    }
  }

  return {
    base: './',
    plugins: [react()],
  }
})
