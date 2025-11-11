const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { getMySQLPool } = require('../config/database');

const router = express.Router();

// 管理端健康检查与统计摘要
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const pool = getMySQLPool();
    const [[userCount]] = await pool.query('SELECT COUNT(*) AS users FROM users');
    const [[chatCount]] = await pool.query('SELECT COUNT(*) AS messages FROM chat_logs');
    const [[convCount]] = await pool.query("SELECT COUNT(DISTINCT conversation_id) AS conversations FROM chat_logs WHERE conversation_id IS NOT NULL");
    res.json({ success: true, data: { users: userCount.users, messages: chatCount.messages, conversations: convCount.conversations } });
  } catch (error) {
    console.error('获取摘要失败:', error);
    res.status(500).json({ success: false, message: '获取摘要失败' });
  }
});

module.exports = router;



