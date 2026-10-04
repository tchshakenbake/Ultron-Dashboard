import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['scripts/**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] },
];

export default eslintConfig;
