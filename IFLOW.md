# fruit-game 项目说明

## 项目概述

这是一个使用 React 构建的切水果游戏项目。游戏基于 Canvas 实现，玩家可以通过鼠标或触摸屏来切割飞出的水果，同时需要避免切到炸弹。项目还集成了 MediaPipe 库，提供了手势追踪功能，允许使用手部动作进行游戏。

### 核心功能
- **切水果游戏**: 经典的切水果游戏，包含水果和炸弹元素
- **手势追踪**: 使用 MediaPipe Hands API 实现手势识别
- **响应式设计**: 适配不同屏幕尺寸
- **动画效果**: 包含粒子效果、平滑动画等视觉反馈

### 技术栈
- **前端框架**: React 19
- **样式**: Tailwind CSS
- **路由**: React Router DOM
- **手势识别**: MediaPipe Hands & Camera Utils
- **构建工具**: Vite
- **代码规范**: ESLint + Prettier

## 项目结构

```
fruit-game/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── pages/
│   │   ├── About/index.jsx
│   │   ├── FruitGame/index.jsx      # 主游戏逻辑
│   │   ├── HandTracker/index.jsx    # 手势追踪功能
│   │   ├── Home/index.jsx
│   │   └── NotFound/index.jsx
│   ├── router/
│   │   └── routes.jsx
│   ├── index.css
│   └── main.jsx
├── package.json
├── vite.config.js
├── tailwind.config.cjs
├── README.md
└── ...
```

## 主要文件说明

### 1. `src/pages/FruitGame/index.jsx`
主游戏组件，包含完整的游戏逻辑：
- 物理模拟（重力、碰撞检测）
- 水果生成和移动
- 切割检测算法
- 粒子效果系统
- 分数和生命值管理
- 游戏状态控制（开始、结束）

### 2. `src/pages/HandTracker/index.jsx`
手势追踪组件，使用 MediaPipe 实现：
- 摄像头访问和视频流处理
- 手部关键点检测
- 关键点和连接线绘制

### 3. `src/router/routes.jsx`
React Router 配置，定义了以下路由：
- `/` - 首页
- `/about` - 关于页面
- `/fruit-game` - 切水果游戏
- `/hand-tracker` - 手势追踪器
- `*` - 404 页面

## 构建和运行

### 开发环境
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 构建
```bash
# 构建生产版本
pnpm build
```

### 预览
```bash
# 预览构建后的应用
pnpm preview
```

### 代码规范
```bash
# 检查代码规范
pnpm lint

# 修复代码规范问题
pnpm lint:fix

# 格式化代码
pnpm format
```

## 游戏机制

### 基本玩法
1. 点击或触摸屏幕并滑动来切割飞出的水果
2. 切到水果得1分
3. 漏掉水果减1生命
4. 切到炸弹游戏直接结束

### 难度递增
- 随着游戏时间增加，水果生成速度加快
- 炸弹出现概率逐渐提高

### 物理系统
- 重力效果：水果受到向下的重力影响
- 拖拽系数：水平速度会逐渐减小
- 边界反弹：水果碰到边界会反弹

## 手势追踪功能

手势追踪功能允许用户使用手部动作来切割水果：
- 摄像头实时捕捉手部图像
- MediaPipe 检测手部关键点
- 关键点之间连接线形成手部轮廓
- 手势移动轨迹可触发切割检测

## 样式和设计

- **主题**: 深色主题，使用 Slate 颜色作为主色调
- **布局**: 使用 Tailwind CSS 实现响应式布局
- **动画**: 平滑的动画过渡和粒子效果
- **视觉效果**: 渐变背景、网格纹理、发光效果

## 开发规范

- 代码遵循 ESLint 和 Prettier 规范
- 使用 React Hooks 进行状态管理
- 使用 React Router 进行页面导航
- 遵循组件化开发模式
- 使用现代 JavaScript (ES6+) 语法