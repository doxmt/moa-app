const expoConfig = require('eslint-config-expo/flat');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: ['supabase/functions/**'],
  },
  ...expoConfig,
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
