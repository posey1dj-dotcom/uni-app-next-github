# 对话式机器人微信小程序部署指南

## 概述

本文档详细说明了如何将对话式机器人微信小程序部署到阿里云服务器上，包括前端小程序发布和后端服务部署。

## 系统要求

### 服务器要求
- **操作系统**: Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **存储**: 50GB以上
- **网络**: 公网IP，带宽5Mbps以上

### 软件要求
- **Node.js**: 16.0+
- **MySQL**: 8.0+
- **Redis**: 6.0+
- **Nginx**: 1.18+ (可选，用于反向代理)

## 部署步骤

### 1. 服务器准备

#### 1.1 连接服务器
```bash
ssh root@your_server_ip
```

#### 1.2 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 1.3 安装基础软件
```bash
# Ubuntu/Debian
sudo apt install -y curl wget git vim htop unzip

# CentOS/RHEL
sudo yum install -y curl wget git vim htop unzip
```

### 2. 安装MySQL 8.0

#### 2.1 下载MySQL安装包
```bash
wget https://dev.mysql.com/get/mysql-apt-config_0.8.22-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.22-1_all.deb
sudo apt update
```

#### 2.2 安装MySQL
```bash
sudo apt install -y mysql-server
```

#### 2.3 配置MySQL
```bash
sudo mysql_secure_installation
```

#### 2.4 创建数据库和用户
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'chatbot_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON chatbot_db.* TO 'chatbot_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 2.5 导入数据库结构
```bash
mysql -u chatbot_user -p chatbot_db < database/init.sql
```

### 3. 安装Redis

#### 3.1 安装Redis
```bash
# Ubuntu/Debian
sudo apt install -y redis-server

# CentOS/RHEL
sudo yum install -y redis
```

#### 3.2 配置Redis
```bash
sudo vim /etc/redis/redis.conf
```

修改以下配置：
```conf
bind 127.0.0.1
port 6379
requirepass your_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### 3.3 启动Redis
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 4. 安装Node.js

#### 4.1 安装Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 4.2 验证安装
```bash
node --version
npm --version
```

#### 4.3 安装PM2
```bash
sudo npm install -g pm2
```

### 5. 部署后端服务

#### 5.1 上传代码
```bash
# 在本地执行
scp -r backend/ root@your_server_ip:/opt/chatbot-backend/
```

#### 5.2 配置环境变量
```bash
cd /opt/chatbot-backend
cp env.example .env
vim .env
```

配置以下关键参数：
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=chatbot_user
DB_PASSWORD=your_mysql_password
DB_NAME=chatbot_db
REDIS_HOST=localhost
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_very_long_random_jwt_secret
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret
DIFY_API_KEY=your_dify_api_key
```

#### 5.3 安装依赖
```bash
npm install --production
```

#### 5.4 启动服务
```bash
# 使用PM2启动
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save
pm2 startup
```

### 6. 配置Nginx反向代理

#### 6.1 安装Nginx
```bash
sudo apt install -y nginx
```

#### 6.2 创建Nginx配置
```bash
sudo vim /etc/nginx/sites-available/chatbot-backend
```

配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

#### 6.3 启用站点
```bash
sudo ln -s /etc/nginx/sites-available/chatbot-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. 配置SSL证书

#### 7.1 安装Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 7.2 获取SSL证书
```bash
sudo certbot --nginx -d your-domain.com
```

#### 7.3 自动续期
```bash
sudo crontab -e
```

添加以下行：
```
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. 配置防火墙

#### 8.1 配置UFW
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 9. 微信小程序发布

#### 9.1 配置小程序信息
1. 登录微信公众平台
2. 配置服务器域名
3. 上传代码并提交审核

#### 9.2 更新配置
在 `miniprogram/app.js` 中更新服务器地址：
```javascript
baseUrl: 'https://your-domain.com/api'
```

## 监控和维护

### 1. 服务监控
```bash
# 查看服务状态
pm2 status
pm2 logs chatbot-backend

# 查看系统资源
htop
df -h
free -h
```

### 2. 日志管理
```bash
# 查看应用日志
tail -f /opt/chatbot-backend/logs/combined.log

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. 数据库维护
```bash
# 备份数据库
mysqldump -u chatbot_user -p chatbot_db > backup_$(date +%Y%m%d).sql

# 优化数据库
mysql -u chatbot_user -p chatbot_db -e "OPTIMIZE TABLE chat_logs;"
```

### 4. 自动备份脚本
创建备份脚本：
```bash
vim /opt/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u chatbot_user -p'your_password' chatbot_db > $BACKUP_DIR/db_backup_$DATE.sql

# 备份应用代码
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/chatbot-backend

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

设置定时任务：
```bash
chmod +x /opt/backup.sh
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /opt/backup.sh
```

## 故障排除

### 1. 常见问题

#### 服务无法启动
```bash
# 检查端口占用
sudo netstat -tulpn | grep :3000

# 检查日志
pm2 logs chatbot-backend
```

#### 数据库连接失败
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查连接
mysql -u chatbot_user -p -h localhost
```

#### Redis连接失败
```bash
# 检查Redis服务状态
sudo systemctl status redis-server

# 测试连接
redis-cli -a your_password ping
```

### 2. 性能优化

#### 数据库优化
```sql
-- 添加索引
CREATE INDEX idx_chat_logs_user_time ON chat_logs(user_id, created_at DESC);

-- 分析表
ANALYZE TABLE chat_logs;
```

#### 应用优化
```bash
# 调整PM2配置
pm2 restart chatbot-backend --update-env
```

## 安全建议

1. **定期更新系统**：保持系统和软件包最新
2. **强密码策略**：使用强密码并定期更换
3. **限制访问**：只开放必要的端口
4. **监控日志**：定期检查异常访问
5. **备份策略**：定期备份重要数据

## 联系支持

如果在部署过程中遇到问题，请：
1. 检查日志文件
2. 查看错误信息
3. 参考官方文档
4. 联系技术支持

---

**注意**：请根据实际情况修改配置参数，特别是密码、域名等敏感信息。





