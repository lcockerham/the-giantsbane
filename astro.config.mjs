import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://the-giantsbane.lcockerham.workers.dev',
  integrations: [tailwind()],
  output: 'static',
});
