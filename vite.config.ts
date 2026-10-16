import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';
import { seoMetaPlugin } from './scripts/vite-plugin-seo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bajo `node --test` (NODE_TEST_CONTEXT), cada proceso de test optimiza sus dependencias en su propia carpeta: `rojo-verde` corre los
// archivos de una orden en paralelo y, con la caché compartida de node_modules/.vite, varios Vite la reescribían a la vez (quedaban
// `deps_temp_*` a medias) y la primera carga pasaba de 60 s (CRM-03, 2026-10-16). Se borra al salir; fuera de los tests no cambia nada.
const cacheDeTest = process.env.NODE_TEST_CONTEXT ? path.join(__dirname, 'node_modules', '.vite-test', String(process.pid)) : undefined;
if (cacheDeTest) process.once('exit', () => { try { rmSync(cacheDeTest, { recursive: true, force: true }); } catch { /* ya no está */ } });

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), seoMetaPlugin()],
    ...(cacheDeTest ? { cacheDir: cacheDeTest } : {}),
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
              if (norm.includes("/motion/")) return "vendor-motion";
              if (norm.includes("/lucide-react/")) return "vendor-icons";
              if (norm.includes("/react-markdown/")) return "vendor-markdown";
              if (norm.includes("/date-fns/")) return "vendor-datefns";
              if (norm.includes("/react-dom/")) return "vendor-react-dom";
              if (norm.includes("/react/")) return "vendor-react";
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
