/** @type {import("stylelint").Config} */
export default {
  // TODO: Figure out what to do about declaration-strict-value needed to be manually set up. Need a way to remind myself not to use harcoded values for things.
  plugins: [
    "stylelint-no-unsupported-browser-features",
    "stylelint-plugin-defensive-css",
  ],
  extends: ["stylelint-config-standard", "stylelint-config-clean-order"],
  rules: {
    // Apprarently this one only works for css
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
