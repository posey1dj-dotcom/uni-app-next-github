const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { getMySQLPool, getRedisClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// 调用Dify API进行对话
router.post('/dify', [
  body('message').notEmpty().withMessage('消息内容不能为空'),
  body('conversation_id').optional().isString().withMessage('会话ID格式错误')
], verifyToken, async (req, res) => {
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

    const { message, conversation_id } = req.body;
    const { userId } = req.user;

    // 检查用户是否有足够的对话次数
    const pool = getMySQLPool();
    const [userStats] = await pool.execute(
      'SELECT daily_chat_count, last_chat_date FROM user_stats WHERE user_id = ?',
      [userId]
    );

    const today = new Date().toISOString().split('T')[0];
    let dailyChatCount = 0;
    let lastChatDate = null;

    if (userStats.length > 0) {
      dailyChatCount = userStats[0].daily_chat_count;
      lastChatDate = userStats[0].last_chat_date;
    }

    // 如果是新的一天，重置计数
    if (lastChatDate !== today) {
      dailyChatCount = 0;
    }

    // 检查每日对话限制
    const dailyLimit = parseInt(process.env.DAILY_CHAT_LIMIT) || 100;
    if (dailyChatCount >= dailyLimit) {
      return res.status(429).json({
        success: false,
        message: '今日对话次数已达上限，请明天再试'
      });
    }

    // 调用Dify API
    const difyResponse = await axios.post(process.env.DIFY_API_URL + '/chat-messages', {
      inputs: {},
      query: message,
      response_mode: 'blocking',
      conversation_id: conversation_id || undefined,
      user: `user_${userId}`
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });

    if (difyResponse.data && difyResponse.data.answer) {
      const reply = difyResponse.data.answer;
      const conversationId = difyResponse.data.conversation_id;

      // 更新用户统计
      if (userStats.length > 0) {
        await pool.execute(
          'UPDATE user_stats SET daily_chat_count = ?, last_chat_date = ? WHERE user_id = ?',
          [dailyChatCount + 1, today, userId]
        );
      } else {
        await pool.execute(
          'INSERT INTO user_stats (user_id, daily_chat_count, last_chat_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [userId, 1, today]
        );
      }

      // 记录对话日志
      await pool.execute(
        'INSERT INTO chat_logs (user_id, user_message, bot_reply, conversation_id, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, message, reply, conversationId]
      );

      res.json({
        success: true,
        message: '获取回复成功',
        data: {
          reply,
          conversation_id: conversationId
        }
      });
    } else {
      throw new Error('Dify API返回数据格式错误');
    }

  } catch (error) {
    console.error('Dify API调用失败:', error);
    
    if (error.response) {
      // Dify API返回错误
      res.status(error.response.status).json({
        success: false,
        message: 'AI服务暂时不可用，请稍后再试'
      });
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      res.status(408).json({
        success: false,
        message: '请求超时，请稍后再试'
      });
    } else {
      // 其他错误
      res.status(500).json({
        success: false,
        message: '获取回复失败，请稍后再试'
      });
    }
  }
});

// 保存对话记录
router.post('/save', [
  body('user_message').notEmpty().withMessage('用户消息不能为空'),
  body('bot_reply').notEmpty().withMessage('机器人回复不能为空'),
  body('conversation_id').optional().isString().withMessage('会话ID格式错误')
], verifyToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数错误',
        errors: errors.array()
      });
    }

    const { user_message, bot_reply, conversation_id } = req.body;
    const { userId } = req.user;

    const pool = getMySQLPool();
    
    // 保存对话记录
    const [result] = await pool.execute(
      'INSERT INTO chat_logs (user_id, user_message, bot_reply, conversation_id, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, user_message, bot_reply, conversation_id]
    );

    res.json({
      success: true,
      message: '对话记录保存成功',
      data: {
        log_id: result.insertId
      }
    });

  } catch (error) {
    console.error('保存对话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '保存对话记录失败'
    });
  }
});

// 获取对话历史
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20, conversation_id } = req.query;
    
    const offset = (page - 1) * limit;
    const pool = getMySQLPool();

    let query = 'SELECT * FROM chat_logs WHERE user_id = ?';
    let params = [userId];

    if (conversation_id) {
      query += ' AND conversation_id = ?';
      params.push(conversation_id);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [logs] = await pool.execute(query, params);
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM chat_logs WHERE user_id = ?' + (conversation_id ? ' AND conversation_id = ?' : ''),
      conversation_id ? [userId, conversation_id] : [userId]
    );

    const total = totalResult[0].total;

    res.json({
      success: true,
      message: '获取对话历史成功',
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取对话历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取对话历史失败'
    });
  }
});

// 获取会话列表
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    const pool = getMySQLPool();

    // 获取会话列表（按会话ID分组）
    const [conversations] = await pool.execute(`
      SELECT 
        conversation_id,
        MAX(created_at) as last_message_time,
        COUNT(*) as message_count,
        MAX(user_message) as last_user_message,
        MAX(bot_reply) as last_bot_reply
      FROM chat_logs 
      WHERE user_id = ? AND conversation_id IS NOT NULL
      GROUP BY conversation_id 
      ORDER BY last_message_time DESC 
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), offset]);

    // 获取总数
    const [totalResult] = await pool.execute(`
      SELECT COUNT(DISTINCT conversation_id) as total 
      FROM chat_logs 
      WHERE user_id = ? AND conversation_id IS NOT NULL
    `, [userId]);

    const total = totalResult[0].total;

    res.json({
      success: true,
      message: '获取会话列表成功',
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话列表失败'
    });
  }
});

// 删除对话记录
router.delete('/history/:logId', verifyToken, async (req, res) => {
  try {
    const { logId } = req.params;
    const { userId } = req.user;

    const pool = getMySQLPool();
    
    // 验证记录归属
    const [logs] = await pool.execute(
      'SELECT id FROM chat_logs WHERE id = ? AND user_id = ?',
      [logId, userId]
    );

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: '对话记录不存在或无权限删除'
      });
    }

    // 删除记录
    await pool.execute(
      'DELETE FROM chat_logs WHERE id = ?',
      [logId]
    );

    res.json({
      success: true,
      message: '对话记录删除成功'
    });

  } catch (error) {
    console.error('删除对话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除对话记录失败'
    });
  }
});

// 清空对话历史
router.delete('/history', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { conversation_id } = req.query;

    const pool = getMySQLPool();
    
    if (conversation_id) {
      // 删除指定会话的所有记录
      await pool.execute(
        'DELETE FROM chat_logs WHERE user_id = ? AND conversation_id = ?',
        [userId, conversation_id]
      );
    } else {
      // 删除用户所有对话记录
      await pool.execute(
        'DELETE FROM chat_logs WHERE user_id = ?',
        [userId]
      );
    }

    res.json({
      success: true,
      message: '对话历史清空成功'
    });

  } catch (error) {
    console.error('清空对话历史失败:', error);
    res.status(500).json({
      success: false,
      message: '清空对话历史失败'
    });
  }
});

// 点赞/取消点赞
router.post('/like', [
  body('message_id').notEmpty().withMessage('消息ID不能为空'),
  body('liked').isBoolean().withMessage('点赞状态格式错误')
], verifyToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数错误',
        errors: errors.array()
      });
    }

    const { message_id, liked } = req.body;
    const { userId } = req.user;

    const pool = getMySQLPool();
    
    // 更新点赞状态
    await pool.execute(
      'UPDATE chat_logs SET liked = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [liked ? 1 : 0, message_id, userId]
    );

    res.json({
      success: true,
      message: liked ? '点赞成功' : '取消点赞成功'
    });

  } catch (error) {
    console.error('更新点赞状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新点赞状态失败'
    });
  }
});

module.exports = router;





