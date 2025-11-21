export default {
  printWidth: 88,
  useTabs: false,
  arrowParens: "always",
  semi: true,
  trailingComma: "all",
  plugins: ["prettier-plugin-jinja-template"],

  overrides: [
    {
      files: ["src/**/*.html"],
      options: { parser: "jinja-template" },
    },
  ],
};
