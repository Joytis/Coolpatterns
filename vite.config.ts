/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the app from /Coolpatterns/; local dev serves from /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/Coolpatterns/') : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
}))
