const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { getMySQLPool, getRedisClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// 微信登录
router.post('/login', [
  body('code').notEmpty().withMessage('微信授权码不能为空')
], async (req, res) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数错误',
        errors: errors.array()
      });
    }

    const { code } = req.body;
    
    // 调用微信API获取openid
    const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WECHAT_APPID,
        secret: process.env.WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (wxResponse.data.errcode) {
      return res.status(400).json({
        success: false,
        message: '微信授权失败: ' + wxResponse.data.errmsg
      });
    }

    const { openid, session_key } = wxResponse.data;
    
    // 查找或创建用户
    const pool = getMySQLPool();
    let [users] = await pool.execute(
      'SELECT * FROM users WHERE openid = ?',
      [openid]
    );

    let userId;
    if (users.length === 0) {
      // 创建新用户
      const [result] = await pool.execute(
        'INSERT INTO users (openid, session_key, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [openid, session_key]
      );
      userId = result.insertId;
    } else {
      // 更新现有用户的session_key
      userId = users[0].id;
      await pool.execute(
        'UPDATE users SET session_key = ?, updated_at = NOW() WHERE id = ?',
        [session_key, userId]
      );
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId, 
        openid,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 将token存储到Redis，设置过期时间
    const redisClient = getRedisClient();
    await redisClient.setEx(`token:${token}`, 30 * 24 * 60 * 60, JSON.stringify({
      userId,
      openid,
      type: 'user'
    }));

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user_id: userId,
        openid
      }
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后再试'
    });
  }
});

// 刷新token
router.post('/refresh', verifyToken, async (req, res) => {
  try {
    const { userId, openid } = req.user;
    
    // 生成新的token
    const newToken = jwt.sign(
      { 
        userId, 
        openid,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 将新token存储到Redis
    const redisClient = getRedisClient();
    await redisClient.setEx(`token:${newToken}`, 30 * 24 * 60 * 60, JSON.stringify({
      userId,
      openid,
      type: 'user'
    }));

    // 删除旧token
    await redisClient.del(`token:${req.token}`);

    res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Token刷新失败:', error);
    res.status(500).json({
      success: false,
      message: 'Token刷新失败'
    });
  }
});

// 登出
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // 从Redis中删除token
    const redisClient = getRedisClient();
    await redisClient.del(`token:${req.token}`);

    res.json({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

// 验证token
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token有效',
    data: {
      user_id: req.user.userId,
      openid: req.user.openid
    }
  });
});

module.exports = router;





