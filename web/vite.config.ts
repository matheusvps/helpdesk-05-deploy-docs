import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the frontend calls /api/... and Vite forwards it to the API,
// so the browser sees a single origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
