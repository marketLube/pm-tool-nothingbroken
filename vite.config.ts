import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Optimize for production
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'framer-motion', 'clsx'],
          charts: ['recharts'],
          utils: ['date-fns']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  // Remove console logs in production
  esbuild: {
    drop: ['console', 'debugger']
  }
});
