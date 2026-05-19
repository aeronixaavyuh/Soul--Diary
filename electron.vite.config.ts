import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // ✅ FIXED: Main entry point explicitly defined
    build: {
      lib: {
        entry: resolve('electron/main.ts'),
      }
    },
    resolve: {
      alias: {
        '@main': resolve('electron')
      }
    }
  },

  preload: {
    plugins: [externalizeDepsPlugin()],
    // ✅ FIXED: Preload entry point explicitly defined
    build: {
      lib: {
        entry: resolve('electron/preload.ts'),
      }
    }
  },

  renderer: {
    root: resolve('src'),
    build: {
      rollupOptions: {
        input: resolve('src/index.html')
      }
    },
    resolve: {
      alias: {
        '@':           resolve('src'),
        '@components': resolve('src/components'),
        '@pages':      resolve('src/pages'),
        '@store':      resolve('src/store'),
        '@utils':      resolve('src/utils'),
        '@themes':     resolve('src/themes'),
        '@editor':     resolve('src/editor'),
        '@ai':         resolve('src/ai')
      }
    },
    plugins: [react()],
    css: {
      postcss: resolve('postcss.config.js')
    }
  }
})