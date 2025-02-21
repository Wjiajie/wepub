# WePub

WePub 是一个基于 Next.js 构建的现代网页内容阅读优化工具。它能将任何网页转换为清晰、易读的文章格式，支持批量抓取和多种格式导出，让您的阅读体验更加舒适。

## ✨ 特色功能

- 🔗 **智能网页抓取**
  - 支持批量抓取网站内容（最多50页）
  - 智能识别文章内容，过滤广告和干扰元素
  - 可设置抓取深度（1-10层），自动发现相关文章

- 📖 **阅读体验优化**
  - 使用 Mozilla Readability 提取主要内容
  - 保留原文格式和图片
  - 添加文章导航，轻松切换章节
  - 支持深色/浅色主题切换

- 💾 **多格式导出**
  - HTML：导出为带目录的网页合集（ZIP）
  - PDF：生成带书签的完整电子书
  - EPUB：适配各类电子阅读器
  - Markdown：方便二次编辑和分享

- 📱 **现代化设计**
  - 响应式布局，完美支持各类设备
  - 简洁优雅的用户界面
  - 人性化的操作流程
  - 详细的错误提示和处理

## 🛠️ 技术栈

### 前端
- **Next.js 14**: 采用 App Router 架构
- **Tailwind CSS**: 现代化的样式解决方案
- **shadcn/ui**: 精美的组件库
- **Mozilla Readability**: 强大的内容提取引擎

### 后端
- **Next.js API Routes**: 一体化的后端服务
- **Vercel**: 可靠的部署平台

## 📦 安装指南

### 前置要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器
- Git

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/wepub.git
cd wepub
```

### 2. 安装依赖
```bash
npm install
# 或使用 yarn
yarn install
```

### 3. 启动开发服务器
```bash
npm run dev
# 或使用 yarn
yarn dev
```

访问 http://localhost:4000 即可看到应用界面

## 🚀 部署指南

### Vercel 部署（推荐）
1. Fork 本项目到你的 GitHub
2. 在 Vercel 中导入项目
3. 点击部署

### 自托管
1. 构建项目
```bash
npm run build
```

2. 启动服务
```bash
npm start
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📝 开发计划

- [ ] 支持更多导出格式
- [ ] 添加文章分类和标签
- [ ] 支持批注和笔记
- [ ] 添加文章分享功能

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 鸣谢

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Mozilla Readability](https://github.com/mozilla/readability)