const js = require('@eslint/js');
const globals = require('globals');

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('eslint-plugin-react-native');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.expo/**',
      // keep ignoring the config file if you want:
      'eslint.config.js',
    ],
  },

  js.configs.recommended,

  // ✅ Node/CommonJS config files (module/require)
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ✅ Jest test files (jest/describe/test/expect)
  {
    files: [
      '**/__test__/**/*.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
      '**/*.{test,spec}.{ts,tsx,js,jsx}',
      'jest.setup.{ts,js}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },

  // ✅ TypeScript/React Native source files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        console: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,
      prettier: prettierPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',

      // Disable base rule (TS plugin handles this better)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      'react-native/no-inline-styles': 'off',
      'no-undef': 'off',
    },
  },
];
