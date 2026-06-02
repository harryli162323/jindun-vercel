# 上海金敦医疗器械进销存系统 — Vercel 部署指南

## 系统概述

本系统为完整的进销存管理系统，包含：
- **产品管理**：产品档案维护，支持规格、供应商、进货单价管理
- **进货管理**：进货订单创建/编辑/删除，自动同步库存
- **销售管理**：销售订单管理，自动计算利润率
- **库存管理**：实时库存查询，按批号追踪
- **客户管理**：客户档案维护
- **数据概览**：销售趋势图、月度统计

**默认账号**：`jindun` / `000000`（部署后请立即修改密码）

---

## 准备工作

### 1. 准备 MySQL 数据库

推荐免费 MySQL 兼容云数据库（任选其一）：

| 服务商 | 免费额度 | 连接字符串格式 |
|--------|---------|--------------|
| [PlanetScale](https://planetscale.com) | 5GB 免费 | `mysql://user:pass@host/db?ssl={"rejectUnauthorized":true}` |
| [Aiven](https://aiven.io) | 1个月免费试用 | `mysql://user:pass@host:port/db?ssl-mode=REQUIRED` |
| [Railway](https://railway.app) | $5/月免费额度 | `mysql://user:pass@host:port/db` |
| [Neon](https://neon.tech) | 免费（MySQL 兼容模式） | `mysql://user:pass@host/db` |
| 阿里云RDS | 按需付费 | `mysql://user:pass@host:3306/db` |

### 2. 初始化数据库

获取数据库连接后，执行 `database-init.sql` 文件中的所有 SQL 语句：

```bash
# 方法一：使用 mysql 命令行
mysql -h <host> -u <user> -p<password> <database> < database-init.sql

# 方法二：在数据库管理界面（如 PlanetScale Console、phpMyAdmin）中粘贴执行
```

---

## 部署到 Vercel

### 方法一：通过 GitHub（推荐）

**步骤 1：上传代码到 GitHub**

1. 在 [GitHub](https://github.com) 创建新仓库（私有仓库）
2. 将本代码包解压后上传：
   ```bash
   cd jindun-vercel
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git push -u origin main
   ```

**步骤 2：在 Vercel 导入项目**

1. 登录 [Vercel](https://vercel.com)，点击 **Add New → Project**
2. 选择 **Import Git Repository**，连接 GitHub 并选择刚创建的仓库
3. 在 **Configure Project** 页面：
   - **Framework Preset**：选择 `Other`
   - **Build Command**：`npm run build`（已在 vercel.json 中配置，无需修改）
   - **Output Directory**：`dist`
4. 点击 **Environment Variables**，添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `mysql://user:pass@host/db` | MySQL 连接字符串 |
| `JWT_SECRET` | 随机字符串（至少32位） | 用于签发 JWT Token |

> **生成 JWT_SECRET**：可使用 `openssl rand -base64 32` 或在线工具生成随机字符串

5. 点击 **Deploy**，等待约 1-2 分钟完成部署

### 方法二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 进入项目目录
cd jindun-vercel

# 登录并部署
vercel login
vercel --prod

# 按提示设置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

---

## 环境变量说明

| 变量名 | 是否必填 | 说明 |
|--------|---------|------|
| `DATABASE_URL` | **必填** | MySQL 数据库连接字符串，格式：`mysql://user:password@host:3306/database` |
| `JWT_SECRET` | **必填** | JWT 签名密钥，建议使用 32 位以上随机字符串 |

---

## 本地开发调试

```bash
# 安装依赖
npm install

# 创建 .env 文件
echo "DATABASE_URL=mysql://user:pass@localhost:3306/jindun" > .env
echo "JWT_SECRET=your-local-secret-key-at-least-32-chars" >> .env

# 启动本地 API 服务（Vercel 开发模式）
npx vercel dev

# 或者仅启动前端（需要单独运行 API）
npm run dev
```

> **注意**：本地开发时，`npm run dev` 会启动 Vite 前端（端口 5173），API 请求会代理到 `localhost:3001`。
> 如需完整本地调试，建议使用 `vercel dev` 命令，它会同时启动前端和 Serverless Function。

---

## 部署后首次使用

1. 访问部署后的域名（如 `https://your-project.vercel.app`）
2. 使用默认账号登录：用户名 `jindun`，密码 `000000`
3. **立即修改密码**：点击右上角用户名 → 修改密码

---

## 常见问题

**Q: 部署后访问出现 500 错误**
A: 检查 Vercel 的 Function Logs，通常是 `DATABASE_URL` 配置错误。确认连接字符串格式正确，数据库已执行初始化 SQL。

**Q: 数据库连接失败（SSL 相关错误）**
A: 部分云数据库需要 SSL 连接，在 `DATABASE_URL` 末尾添加 `?ssl={"rejectUnauthorized":false}` 或按数据库提供商的说明配置。

**Q: 登录后页面空白**
A: 检查浏览器控制台，通常是 `JWT_SECRET` 未配置或数据库中没有账号数据。

**Q: 如何添加新管理员账号**
A: 直接在数据库 `system_accounts` 表中插入记录：
```sql
INSERT INTO system_accounts (username, password) VALUES ('newuser', 'password123');
```

**Q: 如何迁移 Manus 平台上的数据**
A: 在 Manus 平台的数据库管理界面导出数据，然后导入到新数据库即可。

---

## 技术架构

```
前端：React 19 + Vite + Tailwind CSS 4 + shadcn/ui
后端：Vercel Serverless Function (Node.js)
API：tRPC 11（类型安全 RPC）
数据库：MySQL（通过 Drizzle ORM）
认证：JWT（localStorage 存储）
```

---

## 文件结构

```
jindun-vercel/
├── api/
│   └── trpc.ts          # Vercel Serverless Function（所有后端逻辑）
├── client/
│   ├── index.html       # HTML 入口
│   └── src/
│       ├── App.tsx      # 路由 & 认证
│       ├── main.tsx     # 应用入口
│       ├── index.css    # 全局样式
│       ├── components/  # UI 组件
│       ├── pages/       # 页面组件
│       └── lib/         # 工具函数
├── drizzle/
│   └── schema.ts        # 数据库 Schema 定义
├── shared/
│   └── const.ts         # 共享常量
├── database-init.sql    # 数据库初始化 SQL
├── vercel.json          # Vercel 配置
├── vite.config.ts       # Vite 构建配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 依赖声明
```
