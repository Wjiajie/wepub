# WePub

WePub 是一个基于 Next.js 构建的现代网页内容阅读优化工具。它能将任何网页转换为清晰、易读的文章格式，支持批量抓取和多种格式导出，让您的阅读体验更加舒适。

## ✨ 功能模块详解

### 1. 🔗 网页内容抓取模块
- **批量抓取功能**
  - 支持同时抓取多个网页（单次最多50页）
  - 可配置抓取等待时间和重试次数
  - 支持断点续传
  - 自动处理网页编码
  
- **智能内容识别**
  - 基于 Mozilla Readability 的核心内容提取
  - 智能过滤广告、导航栏、页脚等干扰元素
  - 保留原文重要样式和图片资源
  - 支持自定义内容过滤规则

- **抓取深度控制**
  - 可配置1-10层的抓取深度
  - 智能识别文章分页
  - 自动发现相关文章链接
  - 支持自定义URL过滤规则

### 2. 📖 阅读体验优化模块
- **版面优化**
  - 自适应屏幕宽度的响应式布局
  - 可调节字体大小和行间距
  - 支持自定义字体
  - 优化代码块和表格显示

- **导航功能**
  - 自动生成文章目录
  - 快捷键支持
  - 阅读进度保存
  - 书签功能

- **主题定制**
  - 内置浅色/深色主题
  - 支持自定义主题色
  - 多种预设主题方案
  - 护眼模式

### 3. 💾 格式转换导出模块
- **HTML导出**
  - 生成完整的静态网页包
  - 自动打包为ZIP格式
  - 包含目录导航
  - 离线可用

- **PDF导出**
  - 自动生成目录书签
  - 支持自定义页面大小
  - 可配置页眉页脚
  - 支持水印添加

- **EPUB生成**
  - 标准EPUB 3.0格式
  - 自动生成封面
  - 支持目录导航
  - 兼容主流阅读器

- **Markdown转换**
  - 保留文章结构
  - 图片本地化处理
  - 支持扩展语法
  - 便于二次编辑

## 🛠️ 技术架构

### 前端技术栈
- **Next.js 14**: 
  - 采用 App Router 架构
  - 服务端组件渲染
  - 路由预加载
  - API 路由集成

- **Tailwind CSS**: 
  - 原子化CSS方案
  - 响应式设计支持
  - 主题配置系统
  - 暗色模式支持

- **shadcn/ui**: 
  - 可定制组件库
  - 无障碍支持
  - 动画效果
  - 主题集成

- **Mozilla Readability**: 
  - 核心内容提取
  - 智能广告过滤
  - 格式保留
  - 多语言支持

### 后端服务
- **Next.js API Routes**: 
  - RESTful API设计
  - 中间件支持
  - 错误处理
  - 速率限制

- **Vercel部署**: 
  - 自动化部署
  - CDN加速
  - 实时日志
  - 性能监控

## 📦 详细安装指南

### 环境要求
- Node.js 18.0+
- npm 8.0+ 或 yarn 1.22+
- Git 2.0+
- 推荐使用 VSCode 编辑器

### 1. 环境准备
```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v

# 如需升级 npm
npm install -g npm@latest
```

### 2. 获取项目代码
```bash
# 克隆项目
git clone https://github.com/yourusername/wepub.git

# 进入项目目录
cd wepub

# 切换到开发分支（可选）
git checkout develop
```

### 3. 依赖安装
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 如果遇到依赖安装问题，可以尝试清除缓存
npm clean-cache
npm install
```

### 4. 开发服务器
```bash
# 开发环境启动
npm run dev

# 或使用 yarn
yarn dev

# 生产环境构建
npm run build

# 生产环境运行
npm start
```

访问 http://localhost:4000 查看应用

### 5. 开发建议
- 启用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 TypeScript 类型检查
- 定期更新依赖包版本

## 🚀 部署指南

### Vercel 部署流程
1. Fork 项目到个人 GitHub
2. 注册/登录 Vercel 账号
3. 在 Vercel 控制台中选择 "Import Project"
4. 选择已 Fork 的项目仓库
5. 配置环境变量
6. 点击部署

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范
- 遵循 ESLint 配置规则
- 使用 TypeScript 类型注解
- 编写单元测试
- 保持代码简洁清晰

### 提交规范
- feat: 新功能
- fix: 修复问题
- docs: 文档修改
- style: 代码格式修改
- refactor: 代码重构
- test: 测试用例修改
- chore: 其他修改

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 鸣谢

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Mozilla Readability](https://github.com/mozilla/readability)
- [Vercel](https://vercel.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Percollate](https://github.com/danburzo/percollate)