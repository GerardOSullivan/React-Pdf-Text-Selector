import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  build: {
    lib: {
      entry: 'index.ts', 
      name: 'react-pdf-text-selector', 
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ['react', 'react-dom'], 
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          "react-pdf": "ReactPDF"
        },
      },
    },
  },
  plugins: [react(),
    cssInjectedByJsPlugin(),],
}); 
