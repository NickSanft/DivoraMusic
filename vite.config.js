import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  appType: 'mpa',
  build: {
    target: 'es2020',
    cssTarget: 'chrome100',
    // `hidden` keeps the .map files on disk (uploadable to error
    // tracking) but strips the `//# sourceMappingURL` comments so
    // visitors don't auto-load them in DevTools. ~100 KB off the
    // public bundle perception.
    sourcemap: 'hidden',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        lab: resolve(import.meta.dirname, 'lab.html'),
        // GitHub Pages auto-serves 404.html on any missing path.
        notfound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
