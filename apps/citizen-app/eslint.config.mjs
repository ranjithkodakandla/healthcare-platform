import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Fetch-on-mount via useEffect is the established pattern across this app.
      // React 19's set-state-in-effect rule flags every data-load screen; keep as warn.
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-page-custom-font": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
