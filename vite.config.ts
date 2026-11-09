import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so Electron can load dist/ via file://
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    // Pre-bundle with the dev server instead of on the first page request:
    // otherwise every cold smoke run stalls in Vite's optimizer before the
    // game can boot (hub smoke flaked on that ~60s window).
    include: ['phaser'],
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
