const app = getApp();
const { get, post, request } = require('../../utils/request.js');

Page({
  data: {
    conversations: [],
    currentConversation: null,
    messages: [],
    displayMessages: [],
    pagination: {
      page: 1,
      pages: 1,
      total: 0
    },
    convPagination: {
      page: 1,
      pages: 1,
      total: 0
    },
    isLoading: false,
    currentEnv: 'development',
    isMockMode: false,
    isLoggedIn: false,
    userInfo: {}
  },

  onLoad() {
    console.log('历史页面 onLoad');
    this.setEnvironmentInfo();
    this.checkLoginStatus();
  },

  onShow() {
    console.log('历史页面 onShow');
    this.checkLoginStatus();
    this.loadConversations();
  },

  // 设置环境信息
  setEnvironmentInfo() {
    const config = app.globalData.config;
    console.log('历史页面环境配置:', config);
    
    this.setData({
      currentEnv: config.currentEnv,
      isMockMode: config.enableMock
    });
  },

  checkLoginStatus() {
    // 体验版和开发模式下，跳过登录检查
    const config = app.globalData.config;
    if (config.isDev || config.isTrial) {
      console.log(`${config.currentEnv}模式：跳过登录检查`);
      this.setData({ isLoggedIn: true, userInfo: { role: 'user', status: 1 } });
      return;
    }
    
    // 生产环境检查登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看历史记录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        }
      });
      this.setData({ isLoggedIn: false, userInfo: {} });
    } else {
      this.setData({ isLoggedIn: true, userInfo: userInfo || {} });
    }
  },

  // 加载会话列表
  loadConversations() {
    const config = app.globalData.config;
    
    if (config.enableMock) {
      // 模拟模式：使用模拟数据
      console.log('模拟模式：加载模拟会话数据');
      this.loadMockConversations();
    } else {
      // 生产模式：调用真实API
      this.loadRealConversations();
    }
  },

  // 加载模拟会话数据
  loadMockConversations() {
    this.setData({ isLoading: true });
    
    // 模拟网络延迟
    setTimeout(() => {
      const mockConversations = [
        {
          conversation_id: 'conv_001',
          last_user_message: '你好，请介绍一下自己',
          last_bot_reply: '您好！我是您的AI助手，很高兴为您服务。',
          message_count: 3,
          last_message_time: '2024-01-15 14:30'
        },
        {
          conversation_id: 'conv_002',
          last_user_message: '推荐一本好书',
          last_bot_reply: '我推荐《人类简史》，这是一本非常有趣的历史类书籍。',
          message_count: 5,
          last_message_time: '2024-01-14 16:20'
        },
        {
          conversation_id: 'conv_003',
          last_user_message: '如何学习编程？',
          last_bot_reply: '建议从Python开始，通过项目实践来提升技能。',
          message_count: 8,
          last_message_time: '2024-01-13 10:15'
        }
      ];

      this.setData({
        conversations: mockConversations,
        isLoading: false
      });
    }, 500);
  },

  // 加载真实会话数据
  loadRealConversations() {
    try {
      this.setData({ isLoading: true });
      get('/chat/conversations', {}, { requireAuth: true })
        .then((body) => {
          if (body && body.success) {
            const { conversations, pagination } = body.data || { conversations: [], pagination: { page: 1, pages: 1, total: 0 } };
            this.setData({ conversations, pagination, isLoading: false });
          } else {
            this.setData({ isLoading: false });
            wx.showToast({ title: '加载失败', icon: 'none' });
          }
        })
        .catch(() => {
          this.setData({ isLoading: false });
          wx.showToast({ title: '网络错误', icon: 'none' });
        });
    } catch (e) {
      console.error(e);
    }
  },

  // 查看会话详情
  viewConversation(e) {
    const conversation = e.currentTarget.dataset.conversation;
    console.log('查看会话:', conversation);
    
    this.setData({
      currentConversation: conversation
    });
    
    this.loadConversationMessages(conversation.conversation_id);
  },

  // 加载会话消息
  loadConversationMessages(conversationId) {
    const config = app.globalData.config;
    
    if (config.enableMock) {
      // 模拟模式：使用模拟数据
      this.loadMockMessages(conversationId);
    } else {
      // 生产模式：调用真实API
      this.loadRealMessages(conversationId);
    }
  },

  // 加载模拟消息数据
  loadMockMessages(conversationId) {
    this.setData({ isLoading: true });
    
    setTimeout(() => {
      const mockMessages = [
        {
          id: 1,
          user_message: '你好，请介绍一下自己',
          bot_reply: null,
          created_at: '2024-01-15 14:30',
          liked: false
        },
        {
          id: 2,
          user_message: null,
          bot_reply: '您好！我是您的AI助手，很高兴为您服务。有什么可以帮助您的吗？',
          created_at: '2024-01-15 14:31',
          liked: true
        },
        {
          id: 3,
          user_message: '你能做什么？',
          bot_reply: null,
          created_at: '2024-01-15 14:32',
          liked: false
        }
      ];

      this.setData({
        messages: mockMessages,
        isLoading: false
      });
    }, 300);
  },

  // 加载真实消息数据
  loadRealMessages(conversationId) {
    try {
      this.setData({ isLoading: true });
      get('/chat/history', {
        page: this.data.pagination.page,
        limit: 20,
        conversation_id: conversationId
      }, { requireAuth: true })
        .then((body) => {
          if (body && body.success) {
            const { logs, pagination } = body.data || { logs: [], pagination: { page: 1, pages: 1, total: 0 } };
            this.setData({ messages: logs, pagination, isLoading: false });
          } else {
            this.setData({ isLoading: false });
            wx.showToast({ title: '加载失败', icon: 'none' });
          }
        })
        .catch(() => {
          this.setData({ isLoading: false });
          wx.showToast({ title: '网络错误', icon: 'none' });
        });
    } catch (e) {
      console.error(e);
    }
  },

  // 返回会话列表
  backToConversations() {
    this.setData({
      currentConversation: null,
      messages: []
    });
  },

  // 刷新历史记录
  refreshHistory() {
    this.loadConversations();
    wx.showToast({
      title: '已刷新',
      icon: 'success'
    });
  },

  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有对话历史吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          const config = app.globalData.config;
          if (config.enableMock) {
            this.setData({ conversations: [], currentConversation: null, messages: [] });
            wx.showToast({ title: '已清空', icon: 'success' });
            return;
          }

          request({ url: '/chat/history', method: 'DELETE', requireAuth: true })
            .then((body) => {
              if (body && body.success) {
                this.setData({ conversations: [], currentConversation: null, messages: [] });
                wx.showToast({ title: '已清空', icon: 'success' });
              } else {
                wx.showToast({ title: '清空失败', icon: 'none' });
              }
            })
            .catch(() => wx.showToast({ title: '网络错误', icon: 'none' }));
        }
      }
    });
  },

  // 清空当前会话
  clearCurrentConversation() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前会话吗？',
      success: (res) => {
        if (res.confirm) {
          const config = app.globalData.config;
          if (config.enableMock) {
            this.setData({ messages: [] });
            wx.showToast({ title: '已清空', icon: 'success' });
            return;
          }

          if (!this.data.currentConversation) {
            wx.showToast({ title: '操作无效', icon: 'none' });
            return;
          }

          request({
            url: '/chat/history',
            method: 'DELETE',
            data: { conversation_id: this.data.currentConversation.conversation_id },
            requireAuth: true
          })
            .then((body) => {
              if (body && body.success) {
                this.setData({ messages: [] });
                wx.showToast({ title: '已清空', icon: 'success' });
              } else {
                wx.showToast({ title: '清空失败', icon: 'none' });
              }
            })
            .catch(() => wx.showToast({ title: '网络错误', icon: 'none' }));
        }
      }
    });
  },

  // 复制消息
  copyMessage(e) {
    const content = e.currentTarget.dataset.content;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 点赞/取消点赞
  toggleLike(e) {
    const messageId = e.currentTarget.dataset.id;
    const target = this.data.messages.find(m => m.id === messageId);
    if (!target) return;

    const newLiked = !target.liked;
    const config = app.globalData.config;

    if (config.enableMock) {
      const messages = this.data.messages.map(msg => msg.id === messageId ? Object.assign({}, msg, { liked: newLiked }) : msg);
      this.setData({ messages });
      wx.showToast({ title: newLiked ? '已点赞' : '已取消点赞', icon: 'success' });
      return;
    }

    post('/chat/like', { message_id: messageId, liked: newLiked }, { requireAuth: true })
      .then((body) => {
        if (body && body.success) {
          const messages = this.data.messages.map(msg => msg.id === messageId ? Object.assign({}, msg, { liked: newLiked }) : msg);
          this.setData({ messages });
          wx.showToast({ title: newLiked ? '已点赞' : '已取消点赞', icon: 'success' });
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      })
      .catch(() => wx.showToast({ title: '网络错误', icon: 'none' }));
  },

  // 分页相关
  prevPage() {
    if (this.data.pagination.page > 1) {
      this.setData({
        'pagination.page': this.data.pagination.page - 1
      });
      this.loadConversationMessages(this.data.currentConversation.conversation_id);
    }
  },

  nextPage() {
    if (this.data.pagination.page < this.data.pagination.pages) {
      this.setData({
        'pagination.page': this.data.pagination.page + 1
      });
      this.loadConversationMessages(this.data.currentConversation.conversation_id);
    }
  },

  // 跳转到对话页面
  goToChat() {
    wx.switchTab({
      url: '/pages/chat/chat'
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '智能对话助手 - 对话历史',
      path: '/pages/history/history'
    };
  }
});

