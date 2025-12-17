// JavaScript 版本精简配置
module.exports = {
  env: { browser: true, es2021: true },
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  rules: { "prettier/prettier": "error" },
};
