const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getMySQLPool } = require('../config/database');

const router = express.Router();

// 获取用户资料
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const pool = getMySQLPool();

    const [rows] = await pool.execute(
      'SELECT id, openid, nickname, avatar_url, gender, country, province, city, language, status, role, last_login_at, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, message: '获取用户资料成功', data: rows[0] });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({ success: false, message: '获取用户资料失败' });
  }
});

// 获取用户统计
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const pool = getMySQLPool();

    // 总对话次数与今日对话次数
    const [totalRows] = await pool.execute(
      'SELECT COUNT(*) AS totalChats, COALESCE(SUM(tokens_used), 0) AS totalTokens FROM chat_logs WHERE user_id = ?',
      [userId]
    );

    const [todayRows] = await pool.execute(
      'SELECT COUNT(*) AS todayChats FROM chat_logs WHERE user_id = ? AND DATE(created_at) = CURDATE()',
      [userId]
    );

    const data = {
      totalChats: totalRows[0].totalChats || 0,
      todayChats: todayRows[0].todayChats || 0,
      totalTokens: totalRows[0].totalTokens || 0
    };

    res.json({ success: true, message: '获取用户统计成功', data });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({ success: false, message: '获取用户统计失败' });
  }
});

module.exports = router;



