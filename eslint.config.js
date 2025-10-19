import js from "@eslint/js";
import html from "@html-eslint/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginImport from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import pluginN from "eslint-plugin-n";
import pluginPerfectionist from "eslint-plugin-perfectionist";
import pluginPromise from "eslint-plugin-promise";
import * as pluginRegexp from "eslint-plugin-regexp";
import pluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import sonarjs from "eslint-plugin-sonarjs";

const JS_FILES = ["**/*.{js,cjs,mjs}"];

export default defineConfig([
  { ignores: ["dist/**", "build/**", "coverage/**"] },

  {
    files: JS_FILES,
    extends: [
      js.configs.all,
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
      "perfectionist/sort-objects": "off",
      "sort-keys": "off",
    },
  },

  {
    files: ["**/*.html"],
    plugins: { html },
    extends: ["html/recommended"],
    language: "html/html",
  },

  eslintConfigPrettier,
]);
