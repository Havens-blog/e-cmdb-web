import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())

  return {
    // 运维平台同域形态：nginx location ^~ /cmdb/ 静态托管本应用构建产物
    // （与 /console/ haven-console、/cam/ e-cam-web 并列）。
    base: '/cmdb/',

    // 插件配置：Element Plus 按需自动引入（组件 + API 双 unplugin）
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: false,
        },
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts',
      }),
    ],

    // 路径别名
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },

    // 开发服务器配置
    server: {
      // 5173 e-cam-web / 5174 haven-console / 5175 opsagent-web，本应用用 5176
      port: Number(env.VITE_PORT) || 5176,
      host: true,
      cors: true,
      // API 代理：
      // /api/v1/cmdb/* -> e-cmdb-service :8002（独立 CMDB 后端）
      // /api/v1/cam/*  -> e-cam-service :8001（service-tree / topology 仍走 CAM）
      // /api/iam/*     -> eiam :9000 /api/*
      proxy: {
        '/api/v1/cmdb': {
          target: 'http://localhost:8002',
          changeOrigin: true,
        },
        '/api/v1/cam': {
          target: 'http://localhost:8001',
          changeOrigin: true,
        },
        '/api/iam': {
          target: 'http://localhost:9000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/iam/, '/api'),
        },
      },
      warmup: {
        clientFiles: ['./src/main.ts', './src/App.vue'],
      },
    },

    // CSS 配置：迁出的 e-cam-web 页面 scss 依赖 variables/mixins（$var 与 @mixin）
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.scss"; @import "@/assets/styles/mixins.scss";`,
          javascriptEnabled: true,
          silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
        },
      },
    },

    // 构建配置
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: 'esbuild',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // manualChunks 三分包（性能预算与 haven-console 同构）
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'element-plus': ['element-plus'],
            echarts: ['echarts'],
            vendor: ['axios'],
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: '[ext]/[name]-[hash].[ext]',
        },
      },
      esbuild:
        mode === 'production'
          ? {
              drop: ['console', 'debugger'],
            }
          : undefined,
    },

    // 预览服务器配置
    preview: {
      port: 4175,
      host: true,
    },

    // 单元测试（vitest；环境口径与 haven-console/e-cam-web 一致：
    // 默认 node，需要真实 DOM 存储的用例以文件级
    // `// @vitest-environment happy-dom` pragma 切换）
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
      server: {
        deps: {
          inline: [/element-plus/],
        },
      },
    },

    // 日志级别
    logLevel: mode === 'development' ? 'info' : 'warn',
  }
})