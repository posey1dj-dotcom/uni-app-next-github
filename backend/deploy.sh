#!/bin/bash

# 对话式机器人微信小程序后端部署脚本
# 适用于阿里云服务器

echo "🚀 开始部署对话式机器人后端服务..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js已安装，版本: $NODE_VERSION"
fi

# 检查npm版本
echo "📋 检查npm版本..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo "✅ npm已安装，版本: $NPM_VERSION"
fi

# 安装PM2进程管理器
echo "📦 安装PM2进程管理器..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "✅ PM2安装完成"
else
    echo "✅ PM2已安装"
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install --production

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p logs
mkdir -p uploads

# 设置环境变量
echo "⚙️ 配置环境变量..."
if [ ! -f .env ]; then
    echo "⚠️ 未找到.env文件，请手动配置环境变量"
    echo "📝 可以复制env.example文件并修改配置"
else
    echo "✅ 环境变量文件已配置"
fi

# 创建PM2配置文件
echo "⚙️ 创建PM2配置文件..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'chatbot-backend',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# 创建systemd服务文件
echo "⚙️ 创建systemd服务文件..."
sudo tee /etc/systemd/system/chatbot-backend.service > /dev/null << EOF
[Unit]
Description=Chatbot Backend Service
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload chatbot-backend
ExecStop=/usr/bin/pm2 stop chatbot-backend
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 重新加载systemd配置
sudo systemctl daemon-reload

# 启用服务
echo "🔧 启用systemd服务..."
sudo systemctl enable chatbot-backend.service

# 启动服务
echo "🚀 启动服务..."
sudo systemctl start chatbot-backend.service

# 检查服务状态
echo "📊 检查服务状态..."
sudo systemctl status chatbot-backend.service --no-pager

# 检查PM2状态
echo "📊 检查PM2状态..."
pm2 status

# 创建Nginx配置文件（支持HTTPS）
echo "🌐 创建Nginx配置文件..."
sudo tee /etc/nginx/sites-available/chatbot-backend > /dev/null << EOF
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名
    return 301 https://\$server_name\$request_uri;
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;  # 替换为你的域名
    
    # SSL 证书配置（需要手动配置）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline'" always;
}
EOF

# 启用Nginx站点
echo "🔗 启用Nginx站点..."
sudo ln -sf /etc/nginx/sites-available/chatbot-backend /etc/nginx/sites-enabled/

# 测试Nginx配置
echo "🧪 测试Nginx配置..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx配置测试通过"
    # 重启Nginx
    sudo systemctl restart nginx
    echo "✅ Nginx重启完成"
else
    echo "❌ Nginx配置测试失败，请检查配置"
fi

# 创建防火墙规则
echo "🔥 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    echo "✅ 防火墙规则配置完成"
else
    echo "⚠️ ufw未安装，请手动配置防火墙"
fi

# 创建SSL证书（如果使用Let's Encrypt）
echo "🔒 配置SSL证书..."
if command -v certbot &> /dev/null; then
    echo "📝 请运行以下命令获取SSL证书："
    echo "sudo certbot --nginx -d your-domain.com"
else
    echo "⚠️ certbot未安装，请手动安装并配置SSL证书"
fi

# 创建监控脚本
echo "📊 创建监控脚本..."
cat > monitor.sh << 'EOF'
#!/bin/bash

# 监控脚本
echo "=== 系统状态监控 ==="
echo "时间: $(date)"
echo ""

echo "=== 服务状态 ==="
sudo systemctl status chatbot-backend.service --no-pager
echo ""

echo "=== PM2状态 ==="
pm2 status
echo ""

echo "=== 系统资源 ==="
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "内存使用率: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
echo "磁盘使用率: $(df -h / | awk 'NR==2 {print $5}')"
echo ""

echo "=== 网络连接 ==="
netstat -tuln | grep :3000
echo ""

echo "=== 日志检查 ==="
tail -n 10 logs/combined.log
EOF

chmod +x monitor.sh

# 创建定时任务
echo "⏰ 创建定时任务..."
(crontab -l 2>/dev/null; echo "*/5 * * * * cd $(pwd) && ./monitor.sh >> logs/monitor.log 2>&1") | crontab -

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 后续步骤："
echo "1. 配置.env文件中的环境变量"
echo "2. 配置MySQL数据库并运行初始化脚本"
echo "3. 配置Redis服务"
echo "4. 配置微信小程序AppID和Secret"
echo "5. 配置Dify API密钥"
echo "6. 配置域名和SSL证书"
echo ""
echo "🔧 常用命令："
echo "启动服务: sudo systemctl start chatbot-backend"
echo "停止服务: sudo systemctl stop chatbot-backend"
echo "重启服务: sudo systemctl restart chatbot-backend"
echo "查看状态: sudo systemctl status chatbot-backend"
echo "查看日志: pm2 logs chatbot-backend"
echo "监控系统: ./monitor.sh"
echo ""
echo "📞 如有问题，请检查日志文件或联系技术支持"
