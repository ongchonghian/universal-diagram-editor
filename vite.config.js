import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    include: ['js/**/*.test.js', 'evals/**/*.test.js']
  }
});
