import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages(프로젝트 페이지)는 /soundboard/ 하위 경로 — build:pages가 VITE_BASE로 지정
  base: process.env.VITE_BASE || '/',
})
