# 智能楼层导览系统

一个基于 React 和 TypeScript 开发的智能楼层导览系统，提供直观的楼层导航、房间信息展示和开发者模式等功能。

## 功能特点

- 🗺️ 交互式楼层地图
- 🔍 智能搜索功能
- 📍 房间标记和分类
- 📸 照片展示
- 🏷️ 标签管理
- 👨‍💻 开发者模式
- 📱 响应式设计

## 技术栈
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Lucide Icons

## 快速开始

### 环境要求

- Node.js 16.0 或更高版本
- npm 7.0 或更高版本

### 安装步骤

1. 克隆项目
```bash
git clone [你的仓库地址]
cd floor-guide
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 在浏览器中访问
```
http://localhost:5173
```

### 构建生产版本

```bash
npm run build
```

构建后的文件将生成在 `dist` 目录中。

## 使用说明

### 普通用户

1. 查看楼层地图
   - 点击房间标记查看详细信息
   - 使用搜索框搜索特定房间
   - 点击标签筛选相关房间

2. 查看房间详情
   - 基本信息展示
   - 照片查看
   - 标签信息

### 开发者模式

1. 启用开发者模式
   - 在 URL 后添加 `?dev=1` 参数
   - 或使用快捷键 `Cmd/Ctrl + D`

2. 开发者功能
   - 添加新房间：`Cmd/Ctrl + 左键点击`地图
   - 移动房间：拖拽房间标记
   - 编辑房间信息：点击编辑按钮
   - 管理照片：上传/删除照片
   - 管理标签：添加/删除标签
   - 导出配置：点击导出按钮

3. 快捷键
   - `Cmd/Ctrl + D`：切换开发者模式
   - `Cmd/Ctrl + L`：切换标签显示

## 项目结构

```
floor-guide/
├── src/
│   ├── FloorGuide.tsx    # 主组件
│   ├── main.tsx         # 入口文件
│   └── App.tsx          # 应用组件
├── public/
│   └── floor.jpg        # 楼层地图
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 配置说明

### 房间配置

房间信息存储在 `rooms.json` 文件中，包含以下字段：

```typescript
type Room = {
  id: string;           // 房间ID
  name: string;         // 房间名称
  description: string;  // 房间描述
  type: string;         // 房间类型
  coordinates: {        // 坐标位置
    x: number;
    y: number;
  };
  photos?: string[];    // 照片列表
  tags?: string[];      // 标签列表
};
```

### 房间类型

系统支持以下房间类型：
- 教室 (classroom)
- 办公室 (office)
- 实验室 (lab)
- 其他 (other)

## 部署

### 使用 Vercel 部署（推荐）

1. 安装 Vercel CLI
```bash
npm install -g vercel
```

2. 部署项目
```bash
vercel
```

### 使用 GitHub Pages 部署

1. 安装依赖
```bash
npm install --save-dev gh-pages
```

2. 部署项目
```bash
npm run deploy
```

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
