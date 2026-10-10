import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      "react/no-unescaped-entities": "off",
      // Keep the previous lint baseline while migrating from Next 14's legacy `next lint`.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts"]),
]);
