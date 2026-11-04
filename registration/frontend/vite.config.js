import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { BASE_PATH } from '../shared/basePath.js';

const apiProxy = { [`${BASE_PATH}/api`]: 'http://localhost:4001' };

export default defineConfig({
  base: `${BASE_PATH}/`,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: apiProxy,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
  preview: { proxy: apiProxy },
});
