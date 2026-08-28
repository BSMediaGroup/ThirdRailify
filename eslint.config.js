import js from "@eslint/js";
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "pocv1", ".playwright-cli", ".pytest_cache", ".wrangler", "output"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["functions/**/*.js", "cloudflare/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.worker,
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.worker },
    },
  },
  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.worker, ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": hooks,
      "react-refresh": refresh,
    },
    rules: {
      ...hooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }]
    },
  },
);
