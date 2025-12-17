# 项目规则（fruit-game）

## 技术栈与结构

- 前端框架：React（JSX，ESM）+ Vite
- 路由：React Router（`createBrowserRouter`），入口在 `src/router/routes.jsx`
- 样式：Tailwind CSS（`src/index.css` 内 `@import 'tailwindcss';`），Vite 插件 `@tailwindcss/vite`
- 包管理器：pnpm（存在 `pnpm-lock.yaml`）

## 目录约定

- 页面：放在 `src/pages/<PageName>/index.jsx`
- 路由配置：在 `src/router/routes.jsx` 维护页面路由映射
- 静态资源：放在 `src/assets/` 或 `public/`

## 路径别名

- `@/*` 指向 `src/*`
- 使用方式示例：`import Home from '@/pages/Home/index.jsx'`
- 配置位置：`vite.config.js` 与 `jsconfig.json`

## 代码风格

- 统一使用 ESM `import/export`
- 代码格式由 Prettier 维护（`pnpm run format`）
- 代码质量由 ESLint 维护（`pnpm run lint`），提交前不允许产生 warning（`--max-warnings 0`）
- 现有代码风格偏好：单引号、分号、2 空格缩进（以 `src/main.jsx`、`src/router/routes.jsx` 为准）

## 开发与校验命令

- 启动开发：`pnpm run dev`
- 构建产物：`pnpm run build`
- 本地预览：`pnpm run preview`
- Lint：`pnpm run lint`（必要）
- Lint 自动修复：`pnpm run lint:fix`
- 格式化：`pnpm run format`

## 变更要求

- 新增页面时同时更新：`src/pages/...` 与 `src/router/routes.jsx`
