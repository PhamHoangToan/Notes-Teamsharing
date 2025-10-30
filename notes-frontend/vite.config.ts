import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    sveltekit(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/bootstrap-icons/font/fonts',
          dest: '' // copy vào public root (/fonts)
        }
      ]
    })
  ]
});
