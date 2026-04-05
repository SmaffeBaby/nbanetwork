import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(),tailwindcss()],
  resolve: {
    dedupe: ['vue', 'vue-toastification', 'pinia'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.balldontlie.io',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/v1'),
      },
    },
  },
})