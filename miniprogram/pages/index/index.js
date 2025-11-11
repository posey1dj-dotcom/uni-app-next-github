const app = getApp();

Page({
  data: {
    isLoggedIn: false,
    quickQuestion: '',
    userInfo: null,
    currentEnv: 'development',
    isMockMode: false
  },

  onLoad() {
    console.log('首页 onLoad 开始');
    console.log('全局配置:', app.globalData.config);
    
    this.checkLoginStatus();
    this.setEnvironmentInfo();
    
    console.log('首页 onLoad 完成');
  },

  onShow() {
    console.log('首页 onShow');
    this.checkLoginStatus();
  },

  // 设置环境信息
  setEnvironmentInfo() {
    const config = app.globalData.config;
    console.log('设置环境信息:', config);
    
    this.setData({
      currentEnv: config.currentEnv,
      isMockMode: config.enableMock
    });
    
    console.log('当前环境:', config.currentEnv);
    console.log('是否启用模拟模式:', config.enableMock);
    console.log('页面数据:', this.data);
  },

  checkLoginStatus() {
    // 体验版和开发模式下，直接设置为已登录状态
    const config = app.globalData.config;
    if (config.isDev || config.isTrial) {
      console.log(`${config.currentEnv}模式：跳过登录检查，直接设置为已登录`);
      this.setData({
        isLoggedIn: true,
        userInfo: { nickName: config.isTrial ? '体验用户' : '开发用户' }
      });
      return;
    }
    
    // 生产环境检查真实登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({
        isLoggedIn: true,
        userInfo: app.globalData.userInfo || { nickName: '用户' }
      });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null
      });
    }
  },

  // 快速输入处理
  onQuickInput(e) {
    this.setData({
      quickQuestion: e.detail.value
    });
  },

  // 发送快速问题
  sendQuickQuestion() {
    if (!this.data.quickQuestion.trim()) {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }

    // 由于聊天页是 Tab 页，使用本地存储传参
    const question = this.data.quickQuestion.trim();
    try { wx.setStorageSync('pendingQuestion', question); } catch (e) {}
    wx.switchTab({ url: '/pages/chat/chat' });
  },

  // 跳转到对话页面
  goToChat() {
    // 体验版和开发版直接跳转，生产版检查登录
    const config = app.globalData.config;
    // 无权限用户禁止进入
    if (this.data.isLoggedIn && this.data.userInfo && (this.data.userInfo.status !== 1 || (this.data.userInfo.role && this.data.userInfo.role === 'banned'))) {
      wx.showToast({ title: '当前账号无权使用对话功能', icon: 'none' });
      return;
    }

    if (config.isDev || config.isTrial || this.data.isLoggedIn) {
      wx.switchTab({
        url: '/pages/chat/chat'
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '请先登录后再使用对话功能',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.login();
          }
        }
      });
    }
  },

  // 跳转到历史页面
  goToHistory() {
    // 体验版和开发版直接跳转，生产版检查登录
    const config = app.globalData.config;
    if (this.data.isLoggedIn && this.data.userInfo && (this.data.userInfo.status !== 1 || (this.data.userInfo.role && this.data.userInfo.role === 'banned'))) {
      wx.showToast({ title: '当前账号无权查看历史记录', icon: 'none' });
      return;
    }

    if (config.isDev || config.isTrial || this.data.isLoggedIn) {
      wx.switchTab({
        url: '/pages/history/history'
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看历史记录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.login();
          }
        }
      });
    }
  },

  // 跳转到个人中心
  goToProfile() {
    // 体验版和开发版直接跳转，生产版检查登录
    const config = app.globalData.config;
    if (config.isDev || config.isTrial || this.data.isLoggedIn) {
      wx.switchTab({
        url: '/pages/profile/profile'
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看个人中心',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            this.login();
          }
        }
      });
    }
  },

  // 登录
  login() {
    wx.showLoading({
      title: '登录中...'
    });

    app.login().then((res) => {
      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      this.setData({
        isLoggedIn: true,
        userInfo: app.globalData.userInfo
      });
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({
        title: err || '登录失败',
        icon: 'none'
      });
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '智能对话助手 - 您的AI问答伙伴',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '智能对话助手 - 您的AI问答伙伴',
      imageUrl: '/images/share-cover.png'
    };
  }
});
