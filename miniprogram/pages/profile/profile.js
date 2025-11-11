const app = getApp()
const { get, post, request } = require('../../utils/request.js')

Page({
  data: {
    isLoggedIn: false,
    userInfo: {},
    userStats: {
      totalChats: 0,
      todayChats: 0,
      totalTokens: 0
    }
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      // 加载最新资料（含 role/status），并刷新统计
      this.loadUserProfile()
      this.loadUserStats()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    // 体验版和开发模式下，直接设置为已登录状态
    const config = app.globalData.config;
    if (config.isDev || config.isTrial) {
      console.log(`${config.currentEnv}模式：跳过登录检查`);
      this.setData({
        isLoggedIn: true,
        userInfo: {
          nickName: config.isTrial ? '体验用户' : '开发用户',
          avatarUrl: '/images/default-avatar.png'
        }
      });
      return;
    }
    
    // 生产环境检查登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: {}
      });
    }
  },

  // 加载用户资料（含 role/status）
  async loadUserProfile() {
    try {
      const body = await get('/user/profile', {}, { requireAuth: true })
      if (body && body.success) {
        const info = body.data || {}
        this.setData({ userInfo: info })
        // 持久化本地，便于其他页面使用
        try { wx.setStorageSync('userInfo', info) } catch (e) {}
      }
    } catch (e) {
      // 忽略
    }
  },

  // 加载用户统计信息
  async loadUserStats() {
    try {
      const body = await get('/user/stats', {}, { requireAuth: true })
      if (body && body.success) {
        this.setData({ userStats: body.data })
      }
    } catch (error) {
      console.error('加载用户统计信息失败:', error)
    }
  },

  // 跳转到对话历史页面
  goToHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  },

  // 跳转到对话页面
  goToChat() {
    wx.switchTab({
      url: '/pages/chat/chat'
    })
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '智能对话助手 v1.0.0\n\n基于Dify AI技术，为您提供智能对话服务。\n\n如有问题，请联系客服。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 显示意见反馈
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '感谢您的反馈！\n\n请通过以下方式联系我们：\n邮箱：feedback@example.com\n微信：feedback_service',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？\n\n注意：这将清除对话历史等数据。',
      success: (res) => {
        if (res.confirm) {
          this.performClearCache()
        }
      }
    })
  },

  // 执行清除缓存
  async performClearCache() {
    try {
      wx.showLoading({
        title: '清除中...'
      })

      // 清除本地存储
      wx.removeStorageSync('chatHistory')
      wx.removeStorageSync('conversations')
      
      // 调用后端：清空所有对话历史
      await request({ url: '/chat/history', method: 'DELETE', requireAuth: true })

      wx.hideLoading()
      wx.showToast({
        title: '缓存已清除',
        icon: 'success'
      })

      // 重新加载用户统计
      this.loadUserStats()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '清除失败',
        icon: 'error'
      })
      console.error('清除缓存失败:', error)
    }
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们非常重视您的隐私保护：\n\n1. 我们只收集必要的用户信息\n2. 所有对话数据都经过加密处理\n3. 我们不会向第三方分享您的个人信息\n4. 您可以随时删除您的数据',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 登录
  login() {
    app.login()
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.performLogout()
        }
      }
    })
  },

  // 执行退出登录
  async performLogout() {
    try {
      wx.showLoading({
        title: '退出中...'
      })

      // 调用后端退出登录API
      await post('/auth/logout', {}, { requireAuth: true })

      // 清除本地存储
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('chatHistory')
      wx.removeStorageSync('conversations')

      // 更新全局状态
      app.globalData.userInfo = null
      app.globalData.token = null

      wx.hideLoading()
      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      })

      // 更新页面状态
      this.setData({
        isLoggedIn: false,
        userInfo: {},
        userStats: {
          totalChats: 0,
          todayChats: 0,
          totalTokens: 0
        }
      })

      // 跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '退出失败',
        icon: 'error'
      })
      console.error('退出登录失败:', error)
    }
  }
})

