/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 9669,
    strictPort: true,

    proxy: (() => {
      const target =
        process.env.VITE_API_PROXY_TARGET || 'http://localhost:6996';
      return {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          // No rewrite – forward /api/roles to server as /api/roles
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              proxyReq.setHeader('origin', target);
            });
          },
        },
      };
    })(),
  },

  // This makes Vite announce the pretty name in the terminal
  // and enables mDNS (.local) as bonus
  preview: {
    host: 'localhost',
    port: 9669,
  },
});
