import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true, // 将所有类型合并为 index.d.ts，对使用者非常友好
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // 库模式核心
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'cmap-core', // UMD 全局变量名: window.CMap
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // ⚠️ 如果 CMap 依赖了 Leaflet 或 OpenLayers 等库，在这里排除它们
      // external: ['leaflet'],
      // output: { globals: { leaflet: 'L' } }
    },
    sourcemap: true, // 方便用户调试
    emptyOutDir: true, // 自动清空 dist
    minify: 'esbuild', // 压缩混淆
  },
  server: {
    proxy: {
      '/ship': {
        target: 'http://web.aochensoft.com/hxld-back',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(RegExp(`^/ship`), ''),
      },
    },
  },
})
