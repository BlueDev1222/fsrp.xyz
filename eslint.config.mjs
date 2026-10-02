import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  // OAuth endpoints require a full navigation, not a prefetched client transition.
  {
    files: ["src/app/[[]section[]]/page.tsx", "src/app/dashboard/**/page.tsx"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // These are dynamic async server components; each request has a fresh clock.
  { files: ["src/app/**/page.tsx"], rules: { "react-hooks/purity": "off" } },
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
