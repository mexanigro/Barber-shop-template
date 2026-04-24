import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.NEXT_PUBLIC_CLIENT_ID': JSON.stringify(process.env.NEXT_PUBLIC_CLIENT_ID ?? ''),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              // Rollup may normalize paths to POSIX `/` even on Windows — normalize before matching.
              const norm = id.replace(/\\/g, "/");
              if (norm.includes("/firebase/")) {
                if (norm.includes("/firebase/firestore")) return "vendor-firebase-firestore";
                if (norm.includes("/firebase/auth")) return "vendor-firebase-auth";
                if (norm.includes("/firebase/analytics")) return "vendor-firebase-analytics";
                return "vendor-firebase-core";
              }
              if (id.includes("motion")) return "vendor-motion";
              if (id.includes("lucide-react")) return "vendor-icons";
              if (id.includes("react-markdown")) return "vendor-markdown";
              if (id.includes("date-fns")) return "vendor-datefns";
              if (id.includes("react-dom")) return "vendor-react-dom";
              if (id.includes("react")) return "vendor-react";
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
