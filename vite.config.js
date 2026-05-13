import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  appType: 'mpa',
  build: {
    target: 'es2020',
    cssTarget: 'chrome100',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        lab: resolve(import.meta.dirname, 'lab.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
