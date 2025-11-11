// 环境配置文件
const ENV = {
  // 开发环境
  development: {
    baseUrl: 'https://dev.your-domain.com/api', // 开发服务器HTTPS地址
    difyApiUrl: 'https://synthetictube.shop/v1',
    enableMock: true, // 临时启用模拟模式
    logLevel: 'debug'
  },
  
  // 体验版环境（trial）
  trial: {
    baseUrl: 'https://trial.your-domain.com/api', // 体验版服务器HTTPS地址
    difyApiUrl: 'https://synthetictube.shop/v1',
    enableMock: true, // 体验版启用模拟数据，避免网络问题
    logLevel: 'debug'
  },
  
  // 生产环境
  production: {
    baseUrl: 'https://your-domain.com/api', // 生产服务器HTTPS地址
    difyApiUrl: 'https://synthetictube.shop/v1',
    enableMock: false, // 使用真实API
    logLevel: 'error'
  }
};

// 根据编译环境选择配置
let currentEnv = 'development';
let config;

// 安全地获取环境信息
try {
  if (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) {
    currentEnv = __wxConfig.envVersion;
  }
} catch (error) {
  console.warn('无法获取环境信息，使用默认开发环境:', error);
}

// 环境映射
switch (currentEnv) {
  case 'trial':
    config = ENV.trial;
    break;
  case 'release':
    config = ENV.production;
    break;
  default:
    config = ENV.development;
}

// 导出配置
module.exports = Object.assign({}, config, {
  currentEnv,
  isDev: currentEnv === 'development',
  isTrial: currentEnv === 'trial',
  isProd: currentEnv === 'release' || currentEnv === 'production'
});

