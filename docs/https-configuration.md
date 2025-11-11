# 微信小程序 HTTPS 配置指南

## 🚨 **重要提醒**

微信小程序**严格要求**所有网络请求必须使用 HTTPS（TLS 1.2+），不支持 HTTP 请求。

## 📋 **配置要求清单**

### 1. **后端服务器配置**
- ✅ 必须启用 HTTPS（TLS 1.2+）
- ✅ 必须使用有效的 SSL 证书
- ✅ 域名必须备案（中国大陆）
- ✅ 服务器必须支持 HTTPS 请求

### 2. **小程序后台配置**
- ✅ 配置 request 合法域名
- ✅ 配置 uploadFile 合法域名
- ✅ 配置 downloadFile 合法域名
- ✅ 配置 socket 合法域名（如需要）

### 3. **回调地址配置**
- ✅ 支付回调地址必须 HTTPS
- ✅ 消息推送回调必须 HTTPS
- ✅ 所有回调地址必须在微信白名单中

## 🔧 **具体配置步骤**

### 步骤1：获取 SSL 证书
```bash
# 使用 Let's Encrypt 免费证书
sudo certbot --nginx -d your-domain.com

# 或购买商业 SSL 证书
# 推荐：阿里云、腾讯云、DigiCert
```

### 步骤2：配置 Nginx HTTPS
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 强制 HTTPS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 步骤3：小程序后台配置
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发" → "开发管理" → "开发设置"
3. 配置以下合法域名：

```
request 合法域名：
https://your-domain.com

uploadFile 合法域名：
https://your-domain.com

downloadFile 合法域名：
https://your-domain.com

socket 合法域名：
wss://your-domain.com
```

### 步骤4：更新环境配置
```javascript
// miniprogram/config/env.js
const ENV = {
  development: {
    baseUrl: 'https://dev.your-domain.com/api',
    enableMock: true
  },
  production: {
    baseUrl: 'https://your-domain.com/api',
    enableMock: false
  }
};
```

## 🧪 **测试验证**

### 1. **HTTPS 连接测试**
```bash
# 测试 SSL 证书
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 测试 TLS 版本
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

### 2. **小程序网络请求测试**
```javascript
// 在开发者工具中测试
wx.request({
  url: 'https://your-domain.com/api/health',
  success: (res) => {
    console.log('HTTPS 请求成功:', res);
  },
  fail: (err) => {
    console.error('HTTPS 请求失败:', err);
  }
});
```

## ⚠️ **常见问题**

### 问题1：证书不受信任
- 确保使用受信任的 CA 机构颁发的证书
- 检查证书链是否完整
- 验证域名匹配

### 问题2：TLS 版本过低
- 确保服务器支持 TLS 1.2+
- 禁用不安全的加密套件
- 更新 OpenSSL 版本

### 问题3：域名未备案
- 中国大陆服务器必须备案
- 备案通过后等待生效（通常 1-3 天）
- 确保备案信息与域名一致

## 🔒 **安全建议**

1. **使用强加密套件**
2. **启用 HSTS 头**
3. **定期更新 SSL 证书**
4. **监控证书过期时间**
5. **使用安全的 TLS 配置**

## 📞 **技术支持**

如果遇到 HTTPS 配置问题：
1. 检查服务器 SSL 配置
2. 验证域名备案状态
3. 确认小程序后台域名配置
4. 查看开发者工具网络面板错误信息

---

**注意：** 本配置必须在生产环境中完成，开发环境可以使用模拟数据或本地 HTTPS 服务器。





