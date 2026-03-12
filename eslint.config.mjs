import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      ".next-preview/**",
      "node_modules/**",
      "public/**",
      "prisma/**",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  ...nextVitals,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-assign-module-variable": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
