// @ts-check
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "legacy/"] },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      complexity: ["error", 30],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      curly: ["error", "all"],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "max-params": ["error", 9],
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../**", "../../**"],
              message: "Use '@/' alias instead of parent-relative imports. Relative imports within the same directory ('./') are fine.",
            },
          ],
        },
      ],
    },
  }
);
