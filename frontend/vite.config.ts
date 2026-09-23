import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env from backend to share config
  const env = loadEnv(mode, path.resolve(__dirname, '../backend'), '');
  
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const port = new URL(frontendUrl).port ? parseInt(new URL(frontendUrl).port, 10) : 5173;
  
  const backendPort = env.PORT || '5000';
  const backendUrl = `http://localhost:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/admin': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
