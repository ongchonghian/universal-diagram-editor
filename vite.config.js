import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  resolve: {
    alias: {
      'es6-promise-pool': path.resolve(__dirname, 'node_modules/es6-promise-pool/es6-promise-pool.js')
    }
  },
  server: {
    port: 3000,
    open: true,
    https: true,
    allowedHosts: ['.test']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development')
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});


