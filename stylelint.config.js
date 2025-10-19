/** @type {import("stylelint").Config} */
export default {
  plugins: [
    "stylelint-no-unsupported-browser-features",
    "stylelint-plugin-defensive-css",
  ],
  extends: ["stylelint-config-standard", "stylelint-config-clean-order"],
  rules: {
    "plugin/no-unsupported-browser-features": true,
    "plugin/use-defensive-css": [
      true,
      {
        "accidental-hover": true,
        "background-repeat": true,
        "custom-property-fallbacks": true,
        "flex-wrapping": true,
        "scroll-chaining": true,
        "scrollbar-gutter": true,
        "vendor-prefix-grouping": true,
      },
    ],
  },
};
