import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext' // Support top-level await if needed
  }
});
