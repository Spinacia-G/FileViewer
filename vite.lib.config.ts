import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => ['file-viewer'].includes(tag)
        }
      }
    }),
    nodePolyfills({
      protocolImports: true
    }),
    dts({
      rollupTypes: true
    }),
    visualizer()
  ],
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      name: '@spinacia_/file-viewer',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['vue', 'pdfjs-dist'],
      output: {
        exports: 'named',
        globals: {
          'vue': 'Vue',
          'pdfjs-dist': 'PDFJS'
        }
      }
    }
  }
})
