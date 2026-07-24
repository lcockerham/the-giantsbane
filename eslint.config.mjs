import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', '.astro/', 'node_modules/'],
  },
  tseslint.configs.recommended,
  eslintPluginAstro.configs['flat/recommended'],
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
