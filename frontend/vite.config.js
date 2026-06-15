import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React dev server runs on :5173 and talks to the Django API on :8000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
