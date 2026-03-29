import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/SystemPrinting/',
  server: {
    open: true,
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
}));
