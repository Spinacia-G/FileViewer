import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      protocolImports: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      name: 'vue3-file-viewer',
      fileName: 'vue3-file-viewer'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          'vue': 'Vue'
        }
      }
    }
  }
})
