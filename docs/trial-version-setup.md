# 微信小程序体验版配置指南

## 🎯 **体验版概述**

体验版是微信小程序开发流程中的重要环节，用于：
- 内部测试和功能验证
- 用户体验测试
- 上线前的最终验证

## 🔧 **体验版配置要求**

### 1. **环境配置**
体验版使用独立的配置环境，确保与开发版和生产版隔离：

```javascript
// miniprogram/config/env.js
trial: {
  baseUrl: 'https://trial.your-domain.com/api', // 体验版服务器HTTPS地址
  difyApiUrl: 'https://api.dify.ai/v1',
  enableMock: true, // 体验版启用模拟数据，避免网络问题
  logLevel: 'debug'
}
```

### 2. **域名配置**
体验版需要独立的域名配置：

```
体验版域名：
- 主域名：trial.your-domain.com
- API地址：https://trial.your-domain.com/api
- 文件上传：https://trial.your-domain.com/upload
- 文件下载：https://trial.your-domain.com/download
```

## 🚀 **部署步骤**

### 步骤1：配置体验版服务器
```bash
# 在阿里云服务器上创建体验版环境
sudo mkdir -p /var/www/trial
sudo chown -R www-data:www-data /var/www/trial

# 配置体验版Nginx
sudo nano /etc/nginx/sites-available/trial.your-domain.com
```

### 步骤2：Nginx配置
```nginx
# 体验版Nginx配置
server {
    listen 80;
    server_name trial.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name trial.your-domain.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/trial.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trial.your-domain.com/privkey.pem;
    
    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    location / {
        proxy_pass http://localhost:3001; # 体验版使用不同端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 步骤3：获取SSL证书
```bash
# 为体验版域名获取SSL证书
sudo certbot --nginx -d trial.your-domain.com

# 启用体验版站点
sudo ln -s /etc/nginx/sites-available/trial.your-domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤4：启动体验版后端服务
```bash
# 创建体验版PM2配置
cat > ecosystem.trial.config.js << EOF
module.exports = {
  apps: [{
    name: 'chatbot-trial',
    script: 'app.js',
    instances: 1,
    env: {
      NODE_ENV: 'trial',
      PORT: 3001,
      DB_DATABASE: 'chatbot_trial',
      REDIS_DB: 1
    }
  }]
}
EOF

# 启动体验版服务
pm2 start ecosystem.trial.config.js
pm2 save
```

## 📱 **小程序配置**

### 1. **上传体验版**
```bash
# 在微信开发者工具中
1. 点击"上传"按钮
2. 选择"体验版"
3. 填写版本号和项目备注
4. 上传代码
```

### 2. **体验版二维码**
- 上传成功后，在微信公众平台获取体验版二维码
- 分享给测试用户扫码体验

## 🧪 **测试验证**

### 1. **功能测试**
- [ ] 首页正常显示
- [ ] 环境标识正确显示（体验版）
- [ ] 模拟模式正常工作
- [ ] 所有页面跳转正常
- [ ] 对话功能正常

### 2. **网络测试**
```bash
# 测试体验版API
curl -I https://trial.your-domain.com/api/health

# 测试SSL证书
openssl s_client -connect trial.your-domain.com:443
```

### 3. **兼容性测试**
- [ ] 不同手机型号
- [ ] 不同微信版本
- [ ] 不同网络环境

## ⚠️ **注意事项**

### 1. **数据隔离**
- 体验版使用独立的数据库
- 避免与生产数据混淆
- 定期清理测试数据

### 2. **安全考虑**
- 体验版也必须是HTTPS
- 限制访问权限
- 监控异常访问

### 3. **性能优化**
- 体验版服务器配置可以较低
- 启用缓存和压缩
- 监控响应时间

## 🔄 **版本管理**

### 1. **版本号规范**
```
体验版版本号：v1.0.0-trial
开发版版本号：v1.0.0-dev
正式版版本号：v1.0.0
```

### 2. **更新流程**
1. 开发完成 → 上传体验版
2. 测试验证 → 修复问题
3. 再次上传 → 最终验证
4. 提交审核 → 发布正式版

## 📞 **技术支持**

如果体验版遇到问题：
1. 检查服务器状态
2. 查看Nginx错误日志
3. 检查PM2进程状态
4. 验证域名解析
5. 确认SSL证书有效

---

**重要提醒：** 体验版是正式发布前的关键环节，务必充分测试后再提交审核。




