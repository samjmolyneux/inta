import * as pluginRegexp from "eslint-plugin-regexp";
import compat from "eslint-plugin-compat";
import globals from "globals";
import { defineConfig } from "eslint/config";
import html from "@html-eslint/eslint-plugin";
import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import pluginImport from "eslint-plugin-import-x";
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
      // Unicorn controls concise versus explicit arrow returns.
      "arrow-body-style": "off",
      "init-declarations": "off",
      "max-params": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      "max-statements": "off",
      "no-inline-comments": "off",
      // Allow TODO notes while still flagging FIXME and XXX comments.
      "no-warning-comments": ["error", { terms: ["fixme", "xxx"] }],
      "sonarjs/todo-tag": "off",
      "no-unused-vars": ["error", { args: "all" }],
      // Capitalize comment openings while preserving continuation lines and code examples.
      "capitalized-comments": ["error", "always", { ignoreConsecutiveComments: true }],
      "no-shadow": ["error", { builtinGlobals: true, hoist: "all" }],
      "no-ternary": "off",
      "sort-keys": "off",
      // Allow single-line guard clauses without braces.
      curly: ["error", "multi-line"],
      // Name numeric values when their meaning or shared use needs explanation.
      "no-magic-numbers": "off",
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
      // Match Prettier's arrowParens setting.
      "@stylistic/arrow-parens": ["error", "always"],
      "one-var": "off",
      "id-length": "off",
      "unicorn/name-replacements": "off",
      // Parent directories are Python packages and use snake_case.
      "unicorn/filename-case": ["error", { checkDirectories: false }],
      "unicorn/prefer-ternary": "off",
      // Keep parameters that clarify a helper's API, even if callers pass the same value.
      "unicorn/no-unnecessary-parameters": "off",
      // Keep traditional leading asterisks in JSDoc comments.
      "unicorn/no-asterisk-prefix-in-documentation-comments": "off",
    },
  },

  {
    // Check browser APIs only in JavaScript embedded in the generated plots.
    files: ["src/**/*.js"],
    extends: [compat.configs["flat/recommended"]],
  },

  {
    files: ["**/*.html"],
    plugins: { html },
    extends: ["html/recommended"],
    language: "html/html",
    languageOptions: {
      templateEngineSyntax: { "{{": "}}", "{%": "%}", "{#": "#}" },
    },
    rules: {
      "html/indent": "off",
      "html/attrs-newline": "off",
      "html/require-closing-tags": ["error", { selfClosing: "always" }],
      "html/no-extra-spacing-tags": [
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
