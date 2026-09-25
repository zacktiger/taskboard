import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The proxy makes the API look like it's on the same origin as the app,
// so the refresh-token cookie just works and we don't need CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:4000' },
  },
});
