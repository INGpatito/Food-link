import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { authPlugin } from './server/authPlugin.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      tailwindcss(),
      authPlugin()
    ],
    server: {
      port: Number(env.VITE_PORT) || 3000,
      open: false
    },
    assetsInclude: ['**/*.glb', '**/*.gltf']
  };
});
