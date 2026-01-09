// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
    site: 'https://JuanCGomezS.github.io',
    base: '/menu-templates/',
    integrations: [tailwind()],
});
