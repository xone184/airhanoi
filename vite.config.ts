import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: './',
    plugins: [react()],
    define: {
      // Polyfill process.env for the application code
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      'process.env': JSON.stringify(process.env)
    },
    server: {
      host: true
    }
  };
});