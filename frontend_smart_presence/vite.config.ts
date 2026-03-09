import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const enableHttps = env.VITE_DEV_HTTPS === 'true';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/docs': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/openapi.json': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        }
      }
    },
    // Enable HTTPS only when VITE_DEV_HTTPS=true; default is HTTP for smoother local dev
    plugins: enableHttps ? [react(), basicSsl()] : [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
