export default {
  printWidth: 80,
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
