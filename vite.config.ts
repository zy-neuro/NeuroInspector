import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub project Pages: https://<user>.github.io/NeuroInspector/
// CI sets GITHUB_PAGES=true. Local dev keeps base '/'.
const isGitHubPages =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGitHubPages ? '/NeuroInspector/' : '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['h5wasm'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
