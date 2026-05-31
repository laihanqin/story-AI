import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router') || id.includes('node_modules/lucide-react')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: false,
    allowedHosts: ['529cc3e37d8bd160-113-88-78-42.serveousercontent.com', '39718842cb12f0ee-113-88-78-42.serveousercontent.com', '.serveousercontent.com', '.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/stories': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});