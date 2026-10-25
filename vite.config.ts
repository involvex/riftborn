import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so Electron can load dist/ via file://
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
