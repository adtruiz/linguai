import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://linguai.app', // Update with actual domain
  integrations: [
    react(),
    sitemap(),
    mdx(),
  ],
  output: 'static',
  build: {
    assets: '_assets',
  },
});
