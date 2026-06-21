import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "server/prisma/migrations/**",
      "ecosystem.config.cjs",
      "commitlint.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["client/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["server/src/**/*.ts"],
    rules: {
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    files: [
      "server/src/index.ts",
      "server/src/providers/**/*.ts",
      "server/src/middleware/searchTiming.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },
);
