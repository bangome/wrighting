import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const alias = {
  '@shared': resolve('src/shared'),
  '@': resolve('src/renderer/src')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': alias['@shared'] } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': alias['@shared'] } }
  },
  renderer: {
    // SPA 라우팅: 브라우저/Electron 모두에서 동작하도록 base 상대경로
    base: './',
    resolve: { alias },
    plugins: [react(), tailwindcss()]
  }
})
