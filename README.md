# 微信小程序对话助手（开源版）

一个可二次开发的微信小程序对话助手，采用 微信小程序前端 + Node.js 后端 架构。后端统一代理调用 Dify API，前端不持有密钥，便于二次开发与安全部署。

## 功能特性
- 小程序端：多轮聊天、会话管理、历史记录持久化、轻量 UI。
- 后端服务：JWT 鉴权、请求速率限制（Rate Limit）、MySQL 存储、Redis 缓存。
- Dify 集成：通过后端代理转发，隐藏 API Key，支持灵活的策略控制。

## 架构与目录
`
.
├─ backend/                # Node.js + Express 后端
│  ├─ src/                 # 业务代码（路由/控制器/服务/中间件）
│  ├─ package.json
│  └─ .env.example         # 环境变量示例
├─ miniprogram/            # 微信小程序前端
│  ├─ pages/
│  ├─ utils/
│  └─ app.js
├─ .gitignore
├─ README.md
└─ LICENSE
`

## 运行前提
- Node.js ≥ 18
- MySQL ≥ 8.0（或兼容版本）
- Redis ≥ 6.0
- （可选）已申请 Dify API Key

## 快速开始
1）克隆项目
`ash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
`

2）安装后端依赖
`ash
cd backend
npm install
`

3）配置环境变量
在 backend 目录创建 .env（参考 .env.example）：

`ash
# Service
PORT=3000
NODE_ENV=development

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DB=chatdb

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Dify
DIFY_API_BASE=https://api.dify.ai/v1
DIFY_API_KEY=your_dify_key
`

注意：请勿将 .env 文件提交到仓库，仅提交 .env.example。

4）启动后端
`ash
# 开发模式（如已配置 nodemon）
npm run dev

# 或常规启动
npm run start
`

5）导入小程序前端
- 打开 微信开发者工具
- 选择 导入项目，目录指向 miniprogram/
- AppID 可留空进行本地预览（或使用你的测试 AppID）

## API 约定（示例）
实际以 backend/src 实现为准，以下为建议路由形态：
- POST /api/auth/login：登录，返回 access_token
- POST /api/chat：发送一条用户消息，后端代理转发到 Dify
- GET /api/sessions：获取会话列表
- POST /api/sessions：创建会话
- GET /api/messages?sessionId=...：获取某会话的消息历史

通用请求头：
`http
Authorization: Bearer <access_token>
Content-Type: application/json
`

## 常用脚本（后端）
在 backend/package.json 中建议提供如下脚本（示例）：
`json
{
  "scripts": {
    "dev": "nodemon ./src/index.js",
    "start": "node ./src/index.js",
    "lint": "eslint .",
    "test": "node -e \"console.log('no tests yet')\""
  }
}
`
根据你的项目实际情况调整入口文件与脚本。

## 部署与运维
- 生产环境：启用 HTTPS，设置强随机的 JWT_SECRET，限制管理端口访问。
- 数据库：为 MySQL/Redis 设置强密码与网络访问白名单，定期备份。
- 限流策略：按 IP / 用户 / 路由进行速率限制，防刷与防滥用。
- 日志监控：接入进程守护（如 PM2/systemd）、集中日志与告警（如 Loki/ELK）。

## 安全说明
- API Key、数据库密码等敏感信息仅存放于环境变量。
- 如曾误将秘钥提交进仓库历史，请使用 git filter-repo 或 BFG 清理并立即轮换秘钥。
- 不要在前端（小程序）代码中硬编码任何密钥或内网地址。

## 技术栈
- 前端：微信小程序（WXML / WXSS / JS）
- 后端：Node.js、Express
- 数据：MySQL、Redis
- 集成：Dify（后端代理）

## 贡献指南
欢迎提交 Issue / PR！统一规范建议：
- 分支命名：feature/*、fix/*、chore/*
- 提交信息：遵循 Conventional Commits
- PR 内容：说明动机、变更点、测试要点与兼容性影响

## 许可证
本项目基于 Apache License 2.0 开源。详见 LICENSE。

## 致谢
感谢开源社区与相关依赖项目的贡献。若本项目对你有帮助，欢迎点亮 ⭐ Star。
