const mysql = require('mysql2/promise');
const redis = require('redis');

// MySQL连接配置
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chatbot_db',
  charset: 'utf8mb4',
  timezone: '+08:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3
};

// 创建MySQL连接池
let mysqlPool = null;

const createMySQLPool = async () => {
  try {
    mysqlPool = mysql.createPool(mysqlConfig);
    
    // 测试连接
    const connection = await mysqlPool.getConnection();
    console.log('✅ MySQL数据库连接成功');
    connection.release();
    
    return mysqlPool;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    throw error;
  }
};

// 获取MySQL连接池
const getMySQLPool = () => {
  if (!mysqlPool) {
    throw new Error('MySQL连接池未初始化');
  }
  return mysqlPool;
};

// 创建Redis客户端
let redisClient = null;

const createRedisClient = async () => {
  try {
    redisClient = redis.createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis连接错误:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis连接成功');
    });
    
    redisClient.on('ready', () => {
      console.log('✅ Redis准备就绪');
    });
    
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Redis连接失败:', error.message);
    throw error;
  }
};

// 获取Redis客户端
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
};

// 初始化数据库连接
const initDatabase = async () => {
  try {
    await createMySQLPool();
    await createRedisClient();
    console.log('🎉 所有数据库连接初始化完成');
  } catch (error) {
    console.error('💥 数据库初始化失败:', error);
    process.exit(1);
  }
};

// 关闭数据库连接
const closeDatabase = async () => {
  try {
    if (mysqlPool) {
      await mysqlPool.end();
      console.log('✅ MySQL连接已关闭');
    }
    
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis连接已关闭');
    }
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
  }
};

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🔄 正在关闭服务器...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 正在关闭服务器...');
  await closeDatabase();
  process.exit(0);
});

module.exports = {
  initDatabase,
  getMySQLPool,
  getRedisClient,
  closeDatabase
};





