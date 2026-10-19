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
    // Separate comment groups without splitting consecutive commented-out lines.
    "comment-empty-line-before": [
      "always",
      {
        except: ["first-nested"],
        ignore: ["after-comment", "stylelint-commands"],
      },
    ],
    // Maintain browser compatibility prefixes manually without Autoprefixer.
    // eslint-disable-next-line unicorn/no-null -- Stylelint uses null to disable rules.
    "property-no-vendor-prefix": null,
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
