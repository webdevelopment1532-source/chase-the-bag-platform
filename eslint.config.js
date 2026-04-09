// ESLint flat config for chase-the-bag-platform (ESLint v10+)

import js from "@eslint/js";
import * as tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jestPlugin from "eslint-plugin-jest";
import reactPlugin from "eslint-plugin-react";

/** @type {import('eslint').FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      jest: jestPlugin,
    },
    rules: {
      // Add or override rules here
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    ignores: [
      "**/.stryker-tmp/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/dist/**",
      "**/build/**",
    ],
  },
  // Allow CommonJS and Node.js globals for jest.config.js
  {
    files: ["jest.config.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        module: "writable",
        require: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "writable",
        process: "readonly",
      },
    },
    rules: {},
  },
  // Allow Node.js globals for backend files
  {
    files: ["src/backend/**/*.ts", "backend/api/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        require: "writable",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "writable",
        module: "writable",
        console: "readonly",
      },
    },
    rules: {},
  },
];
