// eslint.config.mjs
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**", "build/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-empty": "warn",
      "no-unsafe-finally": "warn",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
]);
