import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
// @ts-expect-error: ESLint flat config doesn't love this plugin's type shape
import boundaries from "eslint-plugin-boundaries";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [".next"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    plugins: {
      boundaries, // Boundaries plugin for enforcing import rules
    },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Temporary overrides for SSE development
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/consistent-generic-constructors": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      // Boundaries: enforce only importing from a feature's `index.ts`
      "boundaries/element-types": [
        "error",
        {
          default: "allow", // <-- This is here so we can incrementally add rules
          rules: [
            {
              from: "feature",
              allow: ["featureIndex"], // only allow importing from other feature index files or shared
            },
            {
              from: "shared",
              allow: ["shared"], // shared can export anything
            },
          ],
        },
      ],
    },
    settings: {
      "boundaries/elements": [
        { type: "feature", pattern: "src/features/*" },
        { type: "featureIndex", pattern: "src/features/*/index.ts" },
        { type: "shared", pattern: "src/features/shared/**" },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: true,
      },
    },
  },
);
