/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  const port = parseInt(env.VITE_DEV_PORT || '9669', 10);
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:6996';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: false,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              proxyReq.setHeader('origin', target);
            });
          },
        },
      },
    },
    preview: {
      host: 'localhost',
      port,
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            // Isolated heavy libs with minimal cross-deps — safe to split
            if (id.includes('node_modules/mermaid')) return 'vendor-mermaid';
            if (id.includes('node_modules/exceljs')) return 'vendor-excel';
            if (
              id.includes('node_modules/cytoscape') ||
              id.includes('node_modules/cose-bilkent') ||
              id.includes('node_modules/dagre')
            )
              return 'vendor-cytoscape';
            // Keep all other node_modules in single vendor to avoid circular
            // deps between vendor-react / vendor-ui / vendor-charts etc.
            return 'vendor';
          },
        },
      },
    },
  };
});
