import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import electron from "eslint-plugin-electron";
import security from "eslint-plugin-security";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        process: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      electron: electron,
      security: security,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...electron.configs.recommended.rules,
      ...security.configs.recommended.rules,
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": "error",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  prettier,
];
