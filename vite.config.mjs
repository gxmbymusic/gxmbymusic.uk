/* ============================================================
   vite.config.mjs
   index.html is the entry. Classic scripts (engine.js etc.) and
   audio live in public/ and are copied to dist/ untouched; only
   src/ is bundled. .mjs because package.json stays CommonJS for
   generate-reactive-sequence.js.
   ============================================================ */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
