import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'app': 'src/app.ts',
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
  external: [
    'pdf-parse',
    'fs',
    'path',
    'crypto',
    'os',
    'http',
    'https',
    'zlib',
    'stream',
    'util'
  ]
});
