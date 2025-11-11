const jwt = require('jsonwebtoken');
const { getRedisClient, getMySQLPool } = require('../config/database');

// 验证JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '缺少访问令牌'
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    // 从Redis中验证token
    const redisClient = getRedisClient();
    const tokenData = await redisClient.get(`token:${token}`);
    
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期或无效'
      });
    }

    // 验证JWT签名
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 验证token数据一致性
    const storedData = JSON.parse(tokenData);
    if (decoded.userId !== storedData.userId || decoded.openid !== storedData.openid) {
      return res.status(401).json({
        success: false,
        message: '访问令牌无效'
      });
    }

    // 将用户信息添加到请求对象
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌格式错误'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期'
      });
    } else {
      console.error('Token验证失败:', error);
      return res.status(500).json({
        success: false,
        message: 'Token验证失败'
      });
    }
  }
};

// 可选token验证（不强制要求登录）
const optionalToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    // 从Redis中验证token
    const redisClient = getRedisClient();
    const tokenData = await redisClient.get(`token:${token}`);
    
    if (!tokenData) {
      req.user = null;
      return next();
    }

    // 验证JWT签名
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 验证token数据一致性
    const storedData = JSON.parse(tokenData);
    if (decoded.userId !== storedData.userId || decoded.openid !== storedData.openid) {
      req.user = null;
      return next();
    }

    // 将用户信息添加到请求对象
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    // 可选验证失败时，不阻止请求继续
    req.user = null;
    next();
  }
};

// 管理员权限验证
const requireAdmin = async (req, res, next) => {
  try {
    // 首先验证token
    await verifyToken(req, res, async () => {
      // 检查用户是否为管理员
      if (req.user.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }
      next();
    });
  } catch (error) {
    // verifyToken中间件已经处理了错误
    return;
  }
};

// 刷新token中间件
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '缺少访问令牌'
      });
    }

    const token = authHeader.substring(7);
    
    // 从Redis中获取token数据
    const redisClient = getRedisClient();
    const tokenData = await redisClient.get(`token:${token}`);
    
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期或无效'
      });
    }

    const storedData = JSON.parse(tokenData);
    
    // 检查token是否即将过期（比如还有1天过期）
    const decoded = jwt.decode(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    
    // 如果token还有超过1天过期，不需要刷新
    if (expiresIn > 24 * 60 * 60) {
      req.user = decoded;
      req.token = token;
      req.needRefresh = false;
      return next();
    }
    
    // 标记需要刷新token
    req.user = decoded;
    req.token = token;
    req.needRefresh = true;
    
    next();
  } catch (error) {
    console.error('Token刷新中间件错误:', error);
    return res.status(401).json({
      success: false,
      message: '访问令牌无效'
    });
  }
};

module.exports = {
  verifyToken,
  optionalToken,
  requireAdmin,
  refreshTokenMiddleware
};

// 仅允许 status = 1 的用户访问聊天功能
async function requireChatAccess(req, res, next) {
  try {
    await verifyToken(req, res, async () => {
      const { userId } = req.user;
      const pool = getMySQLPool();
      const [rows] = await pool.execute('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
      if (!rows || rows.length === 0 || rows[0].status !== 1) {
        return res.status(403).json({ success: false, message: '无权限使用对话功能' });
      }
      // 角色白名单（可选）：通过环境变量 ALLOWED_CHAT_ROLES 控制
      const allowed = (process.env.ALLOWED_CHAT_ROLES || 'user,vip').split(',').map(s => s.trim());
      // 如查询角色失败则默认允许，避免影响旧数据
      if (rows[0].role && !allowed.includes(rows[0].role)) {
        return res.status(403).json({ success: false, message: '当前角色不可使用对话功能' });
      }
      return next();
    });
  } catch (error) {
    // verifyToken 已处理常见错误
    return;
  }
}

module.exports.requireChatAccess = requireChatAccess;





