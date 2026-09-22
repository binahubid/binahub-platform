import { defineConfig, globalIgnores } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

export default defineConfig([
  globalIgnores([
    '**/.next/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/*.d.ts',
  ]),
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // The existing codebase still contains legacy integrations with dynamic
      // Supabase rows. Keep them visible without blocking the first clean CI
      // baseline; new work should prefer unknown and explicit narrowing.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]);
