import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '',
      },
    },
  },
  resolve: {
    alias: {
      '@pages': '/src/pages',
      '@components': '/src/components',
      '@styles': '/src/styles',
      '@models': '/src/models',
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@routing': '/src/routing',
      '@contexts': '/src/contexts',
      '@hooks': '/src/hooks',
      '@themes': '/src/styles/themes',
    }
  }
});