import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'spa',
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    sourcemap: true
  }
});
