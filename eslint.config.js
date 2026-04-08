// ESLint flat config for chase-the-bag-platform (ESLint v10+)

import js from '@eslint/js';
import * as tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import jestPlugin from 'eslint-plugin-jest';

/** @type {import('eslint').FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      jest: jestPlugin,
    },
    rules: {
      // Add or override rules here
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    ignores: [
      '**/.stryker-tmp/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
    ],
  },
];
