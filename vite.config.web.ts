import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * 브라우저 단독(웹) 배포용 빌드 — Electron 메인/프리로드 없이 렌더러만 번들한다.
 * electron.vite.config.ts 의 renderer 설정과 동일한 alias/플러그인을 사용한다.
 * (electron-vite build 는 main·preload·renderer 를 함께 out/ 에 빌드)
 */
export default defineConfig({
  root: resolve('src/renderer'),
  // SPA 라우팅: 상대경로 base 로 어느 경로에 올려도 동작
  base: './',
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@': resolve('src/renderer/src')
    }
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve('out/web'),
    emptyOutDir: true
  }
})
