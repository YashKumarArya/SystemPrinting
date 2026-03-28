import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/SystemPrinting/',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
}));
