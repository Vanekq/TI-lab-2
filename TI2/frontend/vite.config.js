import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: path.resolve(__dirname, 'src'),
    base: './',
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/index.html'),
        },
    },
    server: {
        port: 34115,
        strictPort: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@wailsjs': path.resolve(__dirname, 'wailsjs'),
        },
    },
});