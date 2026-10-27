import { readFileSync } from 'node:fs';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  server: {
    // Phase 2 local dev: `npm run worker:dev` serves the API on :8787.
    proxy: { '/api': 'http://localhost:8787' },
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.png', 'fonts/*.woff2', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Muncak',
        short_name: 'Muncak',
        description: 'Game tebak-tebakan harian. Makin langka, makin tinggi.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1B1F3B',
        background_color: '#1B1F3B',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell, fonts and icons. Daily payloads are never precached.
        globPatterns: ['**/*.{js,css,html,woff2,png,webmanifest}'],
        globIgnores: ['**/daily/**', '**/bank/**', '**/packs/**', 'og-image.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/daily\//, /^\/api\//, /^\/bank\//, /^\/packs\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/daily/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'daily',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 4 },
            },
          },
          {
            // Packs and the Ekspedisi bank stay playable offline once downloaded.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/packs/') || url.pathname.startsWith('/bank/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'bank', expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
