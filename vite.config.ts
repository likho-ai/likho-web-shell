import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import moduleFederationConfig from './module-federation.config.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), federation(moduleFederationConfig)],
  server: {
    port: 5273,
    strictPort: true,
    // Listens on every interface so the gateway container reaches it through the host address.
    host: '0.0.0.0',
    // Behind the local gateway (http://localhost:8080) during development.
    allowedHosts: ['localhost', 'host.docker.internal'],
  },
  build: { target: 'es2022' },
});
