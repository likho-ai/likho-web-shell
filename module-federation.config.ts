import { createModuleFederationConfig } from '@module-federation/vite';

// The shell is the host. Remotes are registered at run time from /mfe/manifest.json (see
// src/lib/remotes.ts), so a release of one app changes one line of the manifest, not the shell.
export const sharedSingletons = {
  react: { singleton: true, eager: true, requiredVersion: '^19.0.0' },
  'react-dom': { singleton: true, eager: true, requiredVersion: '^19.0.0' },
  'react-router': { singleton: true, requiredVersion: '^8.0.0' },
  '@tanstack/react-query': { singleton: true, requiredVersion: '^5.0.0' },
  '@likho-ai/ui': { singleton: true },
  '@likho-ai/web-sdk': { singleton: true },
};

export default createModuleFederationConfig({
  name: 'shell',
  remotes: {},
  dts: false,
  shared: sharedSingletons,
});
