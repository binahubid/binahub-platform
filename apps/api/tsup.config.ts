import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'api/index': 'api/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  noExternal: [
    '@ams/shared',
    '@ams/ai',
    '@ams/config',
    '@ams/database',
    '@ams/domain',
    '@ams/validation',
  ],
});
