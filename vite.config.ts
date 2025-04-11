import { defineConfig } from 'vite';

import { assetpackPlugin } from './scripts/assetpack-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [assetpackPlugin(), tailwindcss()],
    server: {
        port: 8080,
    },
    define: {
        APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
});
