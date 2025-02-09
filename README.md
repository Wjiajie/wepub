# WePub

WePub 是一个基于 Next.js 构建的现代网页内容阅读优化工具。它能将任何网页转换为清晰、易读的文章格式，并提供存储功能，方便用户后续阅读。

## 核心功能

- 🔗 网页内容提取：输入任意网页URL，自动提取主要文章内容
- 📖 阅读优化：移除广告、导航栏等干扰元素，提供纯净的阅读体验
- 💾 文章存储：自动保存转换后的文章到个人库中
- 📱 响应式设计：完美支持桌面和移动设备
- 🎨 深色模式：支持明暗主题切换

## 技术栈

- **Frontend**: 
  - Next.js 14 (App Router)
  - Tailwind CSS
  - shadcn/ui 组件库
  - Mozilla Readability
- **Backend**: 
  - Next.js API Routes
  - Supabase 数据库
  - Vercel 部署

## 本地开发

1. 克隆项目
```bash
git clone https://github.com/yourusername/wepub.git
cd wepub
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量

项目根目录下已提供 `.env.example` 模板文件，复制并重命名为 `.env.local`：
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入必要的环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 项目 URL（从 Supabase 项目设置中获取）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 匿名密钥（从 Supabase 项目设置中获取）

> 提示：这些密钥可以在 Supabase 项目仪表板的 Project Settings > API 中找到

4. 启动开发服务器
```bash
npm run dev
```

## 数据库设置

### 创建 articles 表

1. 登录 Supabase 控制台（https://supabase.com/dashboard）
2. 选择或创建您的项目
3. 在左侧导航栏中，点击"Table Editor"
4. 点击"New Table"按钮
5. 使用以下 SQL 创建表：

```sql
create table articles (
  -- 主键，使用UUID类型
  id uuid primary key default gen_random_uuid(),
  
  -- 原始URL，不允许为空
  url text not null,
  
  -- 文章标题，不允许为空
  title text not null,
  
  -- 文章内容，使用text类型存储HTML内容
  content text not null,
  
  -- 文章摘要，允许为空
  excerpt text,
  
  -- 作者信息，允许为空
  author text,
  
  -- 发布日期，允许为空
  published_date timestamp with time zone,
  
  -- 创建时间，默认为当前时间
  created_at timestamp with time zone default now(),
  
  -- 用户ID，关联用户表
  user_id uuid references auth.users,
  
  -- 添加索引以提高查询性能
  constraint articles_url_unique unique(url)
);

-- 添加RLS策略，允许所有人读取
create policy "允许所有人查看文章"
  on articles for select
  to public
  using (true);

-- 添加RLS策略，只允许已认证用户插入数据
create policy "允许认证用户添加文章"
  on articles for insert
  to authenticated
  with check (true);
```

### 创建索引（可选）

为提高查询性能，建议创建以下索引：

```sql
create index articles_created_at_idx on articles(created_at desc);
create index articles_title_idx on articles(title);
```

### 权限设置

1. 点击新创建的 `articles` 表
2. 选择 "Policies" 标签
3. 点击 "New Policy"
4. 添加以下策略：
   - 允许所有人查看文章
   - 允许认证用户添加文章

## 使用说明

1. 访问应用首页
2. 在输入框中粘贴想要阅读的网页URL
3. 点击"转换"按钮
4. 等待内容提取和优化
5. 阅读优化后的文章内容
6. 文章会自动保存到您的阅读列表中

## 贡献指南

欢迎提交 Pull Request 或创建 Issue。

## 许可证

MIT License