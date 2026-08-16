import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // public/sw.js* é gerado a cada build pelo @serwist/next (fonte real é
    // src/app/sw.ts) — não é código de app, não deveria ser lintado.
    "public/**",
  ]),
]);

export default eslintConfig;
