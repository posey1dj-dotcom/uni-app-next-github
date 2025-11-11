-- 创建数据库
CREATE DATABASE IF NOT EXISTS chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE chatbot_db;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openid VARCHAR(100) NOT NULL UNIQUE COMMENT '微信openid',
    session_key VARCHAR(100) COMMENT '微信session_key',
    nickname VARCHAR(100) COMMENT '用户昵称',
    avatar_url TEXT COMMENT '头像URL',
    gender TINYINT DEFAULT 0 COMMENT '性别：0未知，1男，2女',
    country VARCHAR(50) COMMENT '国家',
    province VARCHAR(50) COMMENT '省份',
    city VARCHAR(50) COMMENT '城市',
    language VARCHAR(20) COMMENT '语言',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用，1正常',
    role ENUM('user','vip','banned') DEFAULT 'user' COMMENT '角色',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_openid (openid),
    INDEX idx_status (status),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用户ID',
    daily_chat_count INT DEFAULT 0 COMMENT '今日对话次数',
    total_chat_count INT DEFAULT 0 COMMENT '总对话次数',
    last_chat_date DATE COMMENT '最后对话日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_date (user_id, last_chat_date),
    INDEX idx_user_id (user_id),
    INDEX idx_last_chat_date (last_chat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计表';

-- 对话日志表
CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用户ID',
    conversation_id VARCHAR(100) COMMENT '会话ID',
    user_message TEXT NOT NULL COMMENT '用户消息',
    bot_reply TEXT NOT NULL COMMENT '机器人回复',
    message_type ENUM('text', 'image', 'file') DEFAULT 'text' COMMENT '消息类型',
    liked TINYINT DEFAULT 0 COMMENT '是否点赞：0否，1是',
    tokens_used INT DEFAULT 0 COMMENT '使用的token数量',
    response_time INT DEFAULT 0 COMMENT '响应时间（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at),
    INDEX idx_liked (liked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话日志表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    description VARCHAR(255) COMMENT '配置描述',
    is_public TINYINT DEFAULT 0 COMMENT '是否公开：0否，1是',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_config_key (config_key),
    INDEX idx_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    email VARCHAR(100) COMMENT '邮箱',
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin' COMMENT '角色',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用，1正常',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT COMMENT '管理员ID',
    user_id INT COMMENT '用户ID',
    action VARCHAR(100) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(50) COMMENT '目标类型',
    target_id INT COMMENT '目标ID',
    details JSON COMMENT '操作详情',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_admin_id (admin_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 插入默认系统配置
INSERT INTO system_config (config_key, config_value, config_type, description, is_public) VALUES
('daily_chat_limit', '100', 'number', '每日对话次数限制', 1),
('max_message_length', '1000', 'number', '最大消息长度', 1),
('enable_voice', 'false', 'boolean', '是否启用语音功能', 1),
('dify_api_url', 'https://api.dify.ai/v1', 'string', 'Dify API地址', 0),
('dify_api_key', '', 'string', 'Dify API密钥', 0),
('wechat_appid', '', 'string', '微信小程序AppID', 0),
('wechat_secret', '', 'string', '微信小程序Secret', 0),
('jwt_secret', '', 'string', 'JWT密钥', 0),
('redis_host', 'localhost', 'string', 'Redis主机地址', 0),
('redis_port', '6379', 'number', 'Redis端口', 0),
('redis_password', '', 'string', 'Redis密码', 0),
('db_host', 'localhost', 'string', '数据库主机地址', 0),
('db_port', '3306', 'number', '数据库端口', 0),
('db_name', 'chatbot_db', 'string', '数据库名称', 0),
('db_user', 'root', 'string', '数据库用户名', 0),
('db_password', '', 'string', '数据库密码', 0);

-- 插入默认超级管理员（password_hash 为 'password' 的 bcrypt 示例值）
INSERT INTO admins (username, password_hash, email, role) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com', 'super_admin');

-- 创建索引优化查询性能
CREATE INDEX idx_chat_logs_user_conversation ON chat_logs(user_id, conversation_id, created_at);
CREATE INDEX idx_chat_logs_user_time ON chat_logs(user_id, created_at DESC);
CREATE INDEX idx_users_openid_status ON users(openid, status);
CREATE INDEX idx_user_stats_user_date ON user_stats(user_id, last_chat_date);

-- 创建视图：用户对话统计
CREATE VIEW v_user_chat_stats AS
SELECT 
    u.id as user_id,
    u.openid,
    u.nickname,
    COUNT(cl.id) as total_messages,
    COUNT(DISTINCT cl.conversation_id) as total_conversations,
    MAX(cl.created_at) as last_chat_time,
    us.daily_chat_count,
    us.total_chat_count
FROM users u
LEFT JOIN chat_logs cl ON u.id = cl.user_id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE u.status = 1
GROUP BY u.id;

-- 创建视图：热门对话话题
CREATE VIEW v_popular_topics AS
SELECT 
    user_message,
    COUNT(*) as message_count,
    COUNT(DISTINCT user_id) as user_count,
    AVG(response_time) as avg_response_time
FROM chat_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY user_message
HAVING message_count > 1
ORDER BY message_count DESC, user_count DESC
LIMIT 100;





