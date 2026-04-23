import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

function normalizeBase(value = '/') {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig({
  output: 'static',
  site: process.env.ASTRO_SITE || 'https://www.first100.org',
  base: normalizeBase(process.env.ASTRO_BASE_PATH || '/'),
  integrations: [sitemap()],
  build: {
    assets: '_assets'
  },
  compressHTML: true,
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@styles': '/src/styles',
        '@data': '/src/data'
      }
    }
  }
});
