import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import jsxA11y from "eslint-plugin-jsx-a11y";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// next/core-web-vitals already wires up eslint-plugin-jsx-a11y, but only
// enables 6 of its ~34 recommended rules (alt-text, aria-props/proptypes,
// aria-unsupported-elements, role-has-required-aria-props,
// role-supports-aria-props — see eslint-config-next/index.js). This app has
// several hand-rolled interactive components (Modal, Sheet, Menu, Tabs,
// MultiSelect, TagInput) where the rest of the recommended set — keyboard
// handlers on click targets, label associations, focus management, valid
// anchors — actually matters. Layering the plugin's full recommended config
// on top catches what Next's subset misses, without dropping anything Next
// already enables (later entries win on rule conflicts in flat config).
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Only the rules, not `plugins` — next/core-web-vitals already registers
    // the jsx-a11y plugin under the same key, and flat config errors on a
    // plugin being registered twice.
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Default depth (2) doesn't reach into this app's common
      // `<label><span><span>title</span><span>helper</span></span><input/></label>`
      // two-line-label pattern (checkbox/toggle rows with a title + helper
      // subtitle). The control and text are both still genuinely nested
      // inside the label; they just sit one level deeper than the default.
      "jsx-a11y/label-has-associated-control": ["error", { depth: 4 }],
    },
  },
];

export default eslintConfig;
