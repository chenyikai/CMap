import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const shipProxyTarget = env.SHIP_PROXY_TARGET || 'http://web.aochensoft.com/hxld-back'

  return {
    base: env.DEMO_BASE_PATH || '/',
    root: '.',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist-demo',
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['local.dev.com'],
      proxy: {
        '/ship': {
          target: shipProxyTarget,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ship/, ''),
        },
      },
    },
  }
})
