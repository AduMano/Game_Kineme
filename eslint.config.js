// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default [
  {
    ignores: ["dist", "node_modules"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.vite,

  // Wrap legacy configs
  ...compat.extends("plugin:jsx-a11y/recommended"),

  {
    settings: {
      react: {
        version: "detect",
      },
    },
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tseslint.parser,
      globals: globals.browser,
    },
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "react/react-in-jsx-scope": "on",

      /* --- Complexity Rules --- */
      complexity: ["warn", 10],
      "max-lines-per-function": ["warn", { max: 70, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 4],
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],

      /* --- General Code Style --- */
      "no-alert": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
]
