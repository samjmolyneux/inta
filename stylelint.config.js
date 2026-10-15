/**
 * @type {import("stylelint").Config}
 */
export default {
  plugins: [
    "stylelint-no-unsupported-browser-features",
    "stylelint-plugin-defensive-css",
  ],
  extends: ["stylelint-config-standard", "stylelint-config-clean-order"],
  rules: {
    "plugin/no-unsupported-browser-features": true,
    "defensive-css/no-accidental-hover": true,
    "defensive-css/no-mixed-vendor-prefixes": true,
    "defensive-css/require-background-repeat": true,
    "defensive-css/require-custom-property-fallback": true,
    "defensive-css/require-flex-wrap": true,
    "defensive-css/require-overscroll-behavior": true,
    "defensive-css/require-scrollbar-gutter": true,
  },
};
