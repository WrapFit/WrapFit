// @ts-check
import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/** Lint for the backend (CI: `npm --workspace=be run lint`). Formatting is Prettier's job, not ESLint's. */
export default tseslint.config(
  { ignores: ['dist/**', 'dist-worker/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { process: 'readonly', require: 'readonly', module: 'readonly', Buffer: 'readonly' } },
    rules: {
      // `_name` marks a parameter or destructured field that is intentionally unused.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    plugins: { import: importPlugin },
    settings: {
      'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      // Modules import each other through their index.ts barrel: a cycle between barrels can leave a Nest module or
      // provider class undefined when its decorator runs. Type-only imports are erased and do not count.
      'import/no-cycle': 'error',
    },
  },
);
