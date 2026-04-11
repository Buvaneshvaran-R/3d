import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: true,
    }),
  ],
  server: {
    open: true,
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});