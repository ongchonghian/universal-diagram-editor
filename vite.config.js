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
  // index.html loads Monaco's AMD loader, which sets a global `define`. Without this setting,
  // UMD packages pre-bundled for the dev server, such as es6-promise-pool inside Excalidraw,
  // see that `define`, register with AMD and export nothing. Mermaid to Excalidraw then fails
  // with "import_es6_promise_pool.default is not a constructor". The production build already
  // takes the CommonJS branch, so this setting makes the dev server match it.
  optimizeDeps: {
    esbuildOptions: {
      define: { define: 'undefined' }
    }
  },
  // Unit tests (npm test). The evaluation set runs in the browser instead (npm run eval).
  test: {
    environment: 'jsdom',
    include: ['js/**/*.test.js', 'evals/**/*.test.js']
  }
});
