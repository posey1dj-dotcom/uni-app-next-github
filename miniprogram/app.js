const config = require('./config/env.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: config.baseUrl,
    difyApiKey: '', // Dify API密钥
    difyApiUrl: config.difyApiUrl,
    config: config // 保存完整配置
  },

  onLaunch() {
    console.log('小程序启动，当前环境:', config.currentEnv);
    console.log('是否启用模拟模式:', config.enableMock);
    console.log('完整配置:', config);

    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        console.log('系统信息获取成功:', res);
      },
      fail: (err) => {
        console.error('系统信息获取失败:', err);
      }
    });
  },

  

  checkLoginStatus() {
    // 体验版和开发模式下，跳过网络请求
    if (config.isDev || config.isTrial) {
      console.log(`${config.currentEnv}模式：跳过登录检查`);
      return;
    }
    
    // 生产环境才检查登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.getUserInfo();
    }
  },

  getUserInfo() {
    
    // 体验版和开发模式下，跳过网络请求
    if (config.isDev || config.isTrial) {
      console.log(`${config.currentEnv}模式：跳过获取用户信息`);
      return;
    }
    
    // 生产环境才调用API
    wx.request({
      url: `${this.globalData.baseUrl}/user/profile`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${this.globalData.token}`
      },
      success: (res) => {
        if (res.data.success) {
          this.globalData.userInfo = res.data.data;
        }
      },
      fail: () => {
        // 登录失败，清除token
        wx.removeStorageSync('token');
        this.globalData.token = null;
      }
    });
  },

  login() {
    return new Promise((resolve, reject) => {
      // 体验版和开发模式下，模拟登录成功
      if (config.isDev || config.isTrial) {
        console.log(`${config.currentEnv}模式：模拟登录成功`);
        const mockUserInfo = {
          nickName: config.isTrial ? '体验用户' : '开发用户',
          avatarUrl: '/images/default-avatar.png'
        };
        this.globalData.userInfo = mockUserInfo;
        resolve({ success: true, data: { userInfo: mockUserInfo } });
        return;
      }
      
      // 生产环境才调用真实登录
      wx.login({
        success: (res) => {
          if (res.code) {
            // 发送code到后端换取token
            wx.request({
              url: `${this.globalData.baseUrl}/auth/login`,
              method: 'POST',
              data: {
                code: res.code
              },
              success: (res) => {
                if (res.data.success) {
                  const token = res.data.data.token;
                  wx.setStorageSync('token', token);
                  this.globalData.token = token;
                  this.getUserInfo();
                  resolve(res.data);
                } else {
                  reject(res.data.message);
                }
              },
              fail: reject
            });
          } else {
            reject('登录失败');
          }
        },
        fail: reject
      });
    });
  },

  logout() {
    wx.removeStorageSync('token');
    this.globalData.token = null;
    this.globalData.userInfo = null;
  }
});
