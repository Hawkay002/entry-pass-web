import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// NOTE: We intentionally do NOT load `eslint-config-next/typescript` here.
// typescript-eslint 8.x hard-errors on TS 7 (see typescript-eslint#10940),
// and Next 16 already runs full type-checking at build time via
// experimental.useTypeScriptCli. ESLint therefore covers code-quality +
// React/Next rules; type errors are caught by `pnpm typecheck` / `pnpm build`.
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
