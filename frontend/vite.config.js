import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Polling-based watcher: more CPU but guaranteed to pick up edits on
    // Windows where native fs events are sometimes missed.
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
