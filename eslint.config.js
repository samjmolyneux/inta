import * as pluginRegexp from "eslint-plugin-regexp";
import globals from "globals";
import { defineConfig } from "eslint/config";
import html from "@html-eslint/eslint-plugin";
import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import pluginImport from "eslint-plugin-import";
import pluginN from "eslint-plugin-n";
import pluginPerfectionist from "eslint-plugin-perfectionist";
import pluginPromise from "eslint-plugin-promise";
import pluginUnicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import stylistic from "@stylistic/eslint-plugin";

const JS_FILES = ["**/*.{js,cjs,mjs}"];

export default defineConfig([
  { ignores: ["dist/**", "build/**", "coverage/**", "eslint.config.*"] },

  {
    files: JS_FILES,
    languageOptions: {
      globals: { ...globals.browser },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    extends: [
      js.configs.all,
      stylistic.configs.recommended,
      sonarjs.configs.recommended,
      pluginImport.flatConfigs.recommended,
      pluginPromise.configs["flat/recommended"],
      pluginN.configs["flat/all"],
      pluginUnicorn.configs.all,
      pluginRegexp.configs["flat/all"],
      pluginPerfectionist.configs["recommended-natural"],
      jsdoc.configs["flat/recommended-error"],
    ],
    rules: {
      "init-declarations": "off",
      "max-params": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      "max-statements": "off",
      "no-inline-comments": "off",
      "no-shadow": ["error", { builtinGlobals: true, hoist: "all" }],
      "no-ternary": "off",
      "sort-keys": "off",
      curly: ["error", "multi-line"], //TODO: what's going on here?
      "no-magic-numbers": ["warn"],
      "perfectionist/sort-objects": "off",
      "perfectionist/sort-imports": "off",
      "perfectionist/sort-classes": "off",
      // Set code max length to 100, because default is 80, but prettier allows longer than it's limit.
      "@stylistic/max-len": ["warn", { code: 100, comments: 100 }],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/spaced-comment": ["warn", "always"],
      "@stylistic/operator-linebreak": ["error", "after"],
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
      // "@stylistic/arrow-parens": ["error", "always"],
      "one-var": "off",
      "id-length": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/prefer-ternary": "off",
    },
  },

  {
    files: ["**/*.html"],
    plugins: { html },
    extends: ["html/recommended"],
    language: "html/html",
    rules: {
      "html/indent": "off",
      "html/attrs-newline": "off",
      "html/require-closing-tags": ["error", { selfClosing: "always" }],
      "html/no-extra-spacing-attrs": [
        "error",
        {
          enforceBeforeSelfClose: true,
          disallowInAssignment: true,
          disallowMissing: true,
          disallowTabs: true,
        },
      ],
    },
  },
]);
