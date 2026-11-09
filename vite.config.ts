import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { authPlugin } from './server/authPlugin.ts';
import { placesPlugin } from './server/placesPlugin.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      tailwindcss(),
      placesPlugin(),
      authPlugin()
    ],
    server: {
      port: Number(env.VITE_PORT) || 3000,
      open: false
    },
    build: {
      // Multi-pagina: landing 3D (/), mapa de rescate (/explorar/) y perfil (/perfil/)
      rolldownOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          explorar: fileURLToPath(new URL('./explorar/index.html', import.meta.url)),
          perfil: fileURLToPath(new URL('./perfil/index.html', import.meta.url))
        }
      }
    },
    assetsInclude: ['**/*.glb', '**/*.gltf']
  };
});
