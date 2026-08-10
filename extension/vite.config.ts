import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(rootDir, 'index.html'),
        popup: resolve(rootDir, 'popup.html'),
        options: resolve(rootDir, 'options.html'),
        serviceWorker: resolve(rootDir, 'src/background/serviceWorker.ts'),
        contentScript: resolve(rootDir, 'src/content/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (
            chunkInfo.name === 'serviceWorker' ||
            chunkInfo.name === 'contentScript'
          ) {
            return 'assets/[name].js'
          }

          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
