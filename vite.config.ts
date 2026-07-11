import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Pure React web app — packaged with Electron
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
