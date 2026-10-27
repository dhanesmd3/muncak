import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'public',
      'node_modules',
      'test-results',
      'playwright-report',
      '**/.wrangler/**',
      '.wrangler-dry',
      'worker/generated',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // src/game is pure logic: no UI, DOM or browser storage (CLAUDE.md, docs/05-teknis.md §2).
    files: ['src/game/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'preact',
            'preact/*',
            '../app/*',
            '../components/*',
            '../storage/*',
            '../scene/*',
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'navigator',
        'location',
        'fetch',
      ],
    },
  },
  {
    // Never log raw device ids (CLAUDE.md rule 7).
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  prettier,
);
