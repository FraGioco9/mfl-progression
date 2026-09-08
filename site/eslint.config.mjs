import js from "@eslint/js";
import globals from "globals";

const recommendedRules = {
  ...js.configs.recommended.rules,
  "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
};

const nodeWebGlobals = {
  ...globals.node,
  fetch: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  Blob: "readonly",
  File: "readonly",
  FormData: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  TextDecoder: "readonly",
  TextEncoder: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  atob: "readonly",
  btoa: "readonly",
  crypto: "readonly",
  structuredClone: "readonly",
};

export default [
  {
    ignores: [
      "node_modules/**",
      ".vercel/**",
      "modules/app-core-runtime.js",
      "modules/app-core-*-runtime.js",
    ],
  },
  {
    files: ["bootstrap.js", "modules/*.js"],
    ignores: ["modules/app-core.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: recommendedRules,
  },
  {
    files: ["bootstrap-core.js", "*-runtime.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.browser,
    },
    rules: {
      ...recommendedRules,
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-undef": "off",
    },
  },
  {
    files: ["modules/app-core.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.browser,
    },
    rules: {},
  },
  {
    files: ["api/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: nodeWebGlobals,
    },
    rules: {
      ...recommendedRules,
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      "build-*.mjs",
      "style-bundle.mjs",
      "validation-text.mjs",
      "vercel-config-source.mjs",
      "ci-quality-scope.mjs",
      "validate*.mjs",
      "validation/*.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
];
