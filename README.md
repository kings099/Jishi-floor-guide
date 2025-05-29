# 济事楼4楼导览

一个基于 React 和 TypeScript 开发的智能楼层导览系统，提供直观的楼层导航、房间信息展示和开发者模式等功能。

**在线访问**: [https://kings099.github.io/Jishi-floor-guide/](https://kings099.github.io/Jishi-floor-guide/)

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
- npm 7.0 或更高版本 (或 pnpm / yarn)

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/kings099/Jishi-floor-guide.git
cd Jishi-floor-guide
```

2. 安装依赖
```bash
npm install
# 或者使用 pnpm
# pnpm install
# 或者使用 yarn
# yarn
```

3. 启动开发服务器
```bash
npm run dev
```
   开发服务器通常运行在 `http://localhost:5173`。

4. 预览生产构建 (可选)
   如果你想在本地测试生产构建的版本：
```bash
npm run build
npm run preview
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
   - 导出配置：点击导出按钮 (会将当前房间配置下载为 `rooms.json`)

3. 快捷键
   - `Cmd/Ctrl + D`：切换开发者模式
   - `Cmd/Ctrl + L`：切换标签显示/隐藏

## 项目结构

```
Jishi-floor-guide/
├── public/
│   ├── floor.jpg        # 楼层地图图片
│   └── rooms.json       # 房间数据配置文件
├── src/
│   ├── FloorGuide.tsx   # 主要的楼层导览组件
│   ├── App.jsx          # (或 App.tsx) 应用根组件
│   └── main.jsx         # (或 main.tsx) 应用入口文件
├── .gitignore
├── eslint.config.js
├── index.html
├── LICENSE
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## 配置说明

### 房间配置

房间信息存储在 `public/rooms.json` 文件中。当处于开发者模式并点击"导出配置"时，当前的地图点位信息会以此格式下载。你可以修改此文件来预设房间信息。
文件包含一个房间对象的数组，每个房间对象包含以下字段：

```typescript
type Room = {
  id: string;           // 房间ID (建议唯一)
  name: string;         // 房间名称
  description: string;  // 房间描述
  type: string;         // 房间类型 (见下方)
  coordinates: {        // 坐标位置 (相对于楼层图片的百分比)
    x: number;          // 0-100
    y: number;          // 0-100
  };
  photos?: string[];    // 照片URL列表 (可以是本地 Data URL 或网络图片链接)
  tags?: string[];      // 标签字符串列表
};
```

### 房间类型

系统内建支持以下房间类型，你也可以在 `src/FloorGuide.tsx` 的 `ROOM_TYPES`常量中自定义或添加更多类型：
- `classroom` (教室)
- `office` (办公室)
- `lab` (实验室)
- `meeting` (会议室)
- `other` (其他)

## 部署

本项目配置为使用 GitHub Pages 进行部署。

1. **确保远程仓库已正确设置**：
   你的 `package.json` 中的 `deploy` 脚本应配置为指向你的 GitHub 仓库。
   例如: `"deploy": "gh-pages -d dist -r https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git"`
   (本项目已配置为 `https://github.com/kings099/Jishi-floor-guide.git`)

2. **运行部署命令**：
```bash
npm run deploy
```
   此命令会先执行 `npm run build` 构建项目，然后使用 `gh-pages` 工具将 `dist` 目录的内容推送到远程仓库的 `gh-pages` 分支。

3. **访问部署的站点**：
   部署完成后，你的站点应该可以通过 `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/` 访问。
   对于本项目，链接是：[https://kings099.github.io/Jishi-floor-guide/](https://kings099.github.io/Jishi-floor-guide/)

   注意：GitHub Pages 可能需要几分钟才能更新。

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过 GitHub Issues 或 Pull Requests 联系。
