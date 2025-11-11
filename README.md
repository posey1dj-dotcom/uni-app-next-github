# 微信小程序对话助手（开源版）

一句话简介：一个可二次开发的微信小程序对话助手，前端小程序 + Node.js 后端。

## 功能特性
- 小程序端：聊天、会话管理、历史记录
- 后端：JWT 鉴权、速率限制、MySQL + Redis
- Dify 集成：通过后端代理调用（前端不持有密钥）

## 截图
（请自行添加 1–3 张关键界面截图到 miniprogram/images 并在此链接）

## 快速开始
`ash
# 1) 安装依赖\ncd backend && npm install\n
# 2) 配置环境变量
# 在 backend 目录创建 .env，参考 backend/.env.example
# 在仓库根目录可选创建 .env，参考 .env.example（供 CI/预览用）

# 3) 启动后端
npm run start  # 在 backend 目录

# 4) 小程序导入
# 使用微信开发者工具导入 miniprogram 目录，AppID 可留空预览
`

## 配置
- 敏感信息全部走环境变量：API Key、数据库密码、AppID 等
- 示例参见：.env.example、ackend/.env.example

## 技术栈
- 微信小程序原生（WXML/WXSS/JS）
- Node.js + Express，MySQL，Redis

## 贡献
欢迎 PR 与 Issues！建议先阅读 CONTRIBUTING.md（如有）。

## 许可证
本项目基于 Apache-2.0 开源。

