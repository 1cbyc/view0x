import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[tj]sx?$/,
    exclude: [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
          ],
          'vendor-editor': ['@uiw/react-codemirror', '@codemirror/lang-javascript'],
          'vendor-utils': ['axios', 'socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning threshold
    sourcemap: false, // Disable sourcemaps in production for smaller bundles
  },
}); 