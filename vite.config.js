import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH=./ (set by the deploy workflow) makes every asset path relative,
// so the built site works at any URL, including after a repository rename.
// Two pages: index.html (sector overview) and companies.html (Maharatna company financials).
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        companies: resolve(import.meta.dirname, 'companies.html'),
      },
    },
  },
});
