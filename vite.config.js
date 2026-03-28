import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SystemPrinting/',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
