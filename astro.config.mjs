import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://thegiantsbane.replit.app',
  integrations: [tailwind()],
  output: 'static',
});
