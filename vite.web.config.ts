import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: true,
    outDir: resolve('out/renderer')
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  root: 'src/renderer'
})
