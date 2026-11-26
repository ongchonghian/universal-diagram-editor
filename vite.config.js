import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { archifyPlugin } from './server/vite-plugin-archify.js';

export default defineConfig({
  // archifyPlugin: the server draws Archify diagrams with the Archify renderer installed on this computer
  plugins: [react(), archifyPlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Unit tests (npm test). The evaluation set runs in the browser instead (npm run eval).
  test: {
    environment: 'jsdom',
    include: ['js/**/*.test.js', 'evals/**/*.test.js', 'server/**/*.test.js']
  }
});
