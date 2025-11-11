const app = getApp();
const envConfig = require('../../config/env.js');

Page({
  data: {
    // 聊天消息列表
    messages: [],
    // 输入框内容
    inputMessage: '',
    // 是否正在发送（防止重复点击）
    isSending: false,
    // 输入框是否为空
    isInputEmpty: true,
    // 当前环境
    currentEnv: 'development',
    // 用户头像
    userAvatar: '/images/default-avatar.png',
    // AI头像
    aiAvatar: '/images/default-avatar.png',
    // 滚动到指定消息
    scrollToMessage: '',
    // 对话ID（用于多轮对话）
    cid: '',
    // 快捷问题
    quickQuestions: [
      '你好，请介绍一下自己',
      '今天天气怎么样？',
      '推荐一本好书',
      '如何学习编程？',
      '健康生活小贴士'
    ]
  },

  onLoad(options) {
    console.log('聊天页面加载');
    
    // 初始化页面状态
    this.setData({
      isInputEmpty: true,
      isSending: false,
      messages: []
    });
    
    // 如果有传入的问题，直接发送
    if (options.question) {
      this.setData({
        inputMessage: decodeURIComponent(options.question),
        isInputEmpty: false
      });
      this.sendMessage();
    }
  },

  onShow() {
    console.log('聊天页面显示');
    // 从本地获取待发送问题
    try {
      const pending = wx.getStorageSync('pendingQuestion');
      if (pending) {
        wx.removeStorageSync('pendingQuestion');
        this.setData({ inputMessage: pending, isInputEmpty: false });
        this.sendMessage();
      }
    } catch (e) {}
  },

  // 输入框内容变化处理
  onInputChange(e) {
    const value = e.detail.value;
    const trimmedValue = value ? value.replace(/^\s+|\s+$/g, '') : '';
    const isEmpty = !trimmedValue || trimmedValue.length === 0;
    
    this.setData({
      inputMessage: value,
      isInputEmpty: isEmpty
    });
  },

  // 发送消息
  sendMessage() {
    const message = this.data.inputMessage;
    const trimmedMessage = message ? message.replace(/^\s+|\s+$/g, '') : '';
    
    // 检查输入是否为空
    if (!trimmedMessage) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否正在发送
    if (this.data.isSending) {
      wx.showToast({
        title: '正在发送中',
        icon: 'none'
      });
      return;
    }

    // 添加用户消息到聊天列表
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: trimmedMessage,
      time: this.getTimeString()
    };

    const newMessages = this.data.messages.concat([userMessage]);
    
    this.setData({
      messages: newMessages,
      inputMessage: '',
      isSending: true,
      isInputEmpty: true
    });

    // 调用Dify API获取AI回复
    this.callDifyAPI(trimmedMessage);
  },

  // 发送快捷问题
  sendQuickQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({
      inputMessage: question,
      isInputEmpty: false
    });
    this.sendMessage();
  },

  // 调用后端API
  callDifyAPI(message) {
    const that = this;
    
    // 检查是否启用模拟模式
    if (envConfig.enableMock) {
      console.log('模拟模式：使用模拟AI回复');
      this.getMockResponse(message);
      return;
    }
    
    // 小程序直连公开入口，由服务器(Nginx)注入Authorization
    wx.request({
      url: (envConfig && envConfig.baseUrl ? ${envConfig.baseUrl}/chat : '/api/chat'),
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      timeout: 20000,
      data: {
        query: message,
        response_mode: 'blocking',
        user: this.data.userId || 'mp-user-demo',
        inputs: {},
        conversation_id: this.data.cid || null
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const { answer, conversation_id } = res.data || {};
          const reply = answer || '抱歉，我无法理解您的问题。';
          if (conversation_id) {
            that.setData({ cid: conversation_id });
          }
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: reply,
            time: that.getTimeString()
          };
          const newMessages = that.data.messages.concat([botMessage]);
          that.setData({ messages: newMessages, isSending: false });
          that.scrollToLatestMessage();
        } else {
          wx.showToast({ title: '接口错误', icon: 'error' });
          console.error('HTTP', res.statusCode, res.data);
          that.handleAPIError('服务繁忙，请稍后再试');
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'error' });
        console.error(err);
        that.handleAPIError('网络请求失败');
      }
    });
  },

  // 直接调用Dify API（已废弃，因为域名白名单问题）
  callDifyAPIDirect(message) {
    const that = this;
    
    // API配置
    const apiUrl = 'https://synthetictube.shop/v1/chat-messages';
    const appToken = ''; // 你的Dify AppToken
    
    wx.request({
      url: apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appToken}`
      },
      data: {
        query: message,
        response_mode: 'blocking',
        conversation_id: this.data.conversationId || undefined,
        user: 'miniprogram_user' // 添加user参数
      },
      success: function(res) {
        console.log('Dify API响应:', res);
        
        if (res.statusCode === 200 && res.data) {
          // 处理成功响应
          const aiResponse = res.data.answer || res.data.message || '抱歉，我无法理解您的问题。';
          
          // 更新对话ID（如果API返回了新的对话ID）
          if (res.data.conversation_id) {
            that.setData({
              conversationId: res.data.conversation_id
            });
          }
          
          // 添加AI回复到聊天列表
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: aiResponse,
            time: that.getTimeString()
          };

          const newMessages = that.data.messages.concat([botMessage]);
          
          that.setData({
            messages: newMessages,
            isSending: false
          });
          
          // 滚动到最新消息
          that.scrollToLatestMessage();
          
        } else {
          // 处理API错误响应
          console.error('API返回错误:', res);
          that.handleAPIError('API返回错误状态');
        }
      },
      fail: function(error) {
        console.error('API请求失败:', error);
        that.handleAPIError('网络请求失败');
      }
    });
  },

  // 获取模拟响应（用于测试）
  getMockResponse(message) {
    const that = this;
    
    // 模拟网络延迟
    setTimeout(() => {
      const mockReply = this.generateMockReply(message);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: mockReply,
        time: this.getTimeString()
      };

      const newMessages = this.data.messages.concat([botMessage]);
      
      this.setData({
        messages: newMessages,
        isSending: false
      });
      
      // 滚动到最新消息
      this.scrollToLatestMessage();
    }, 1000 + Math.random() * 1000); // 1-2秒随机延迟
  },

  // 生成模拟AI回复
  generateMockReply(message) {
    const mockReplies = {
      '你好': '您好！我是您的AI助手，很高兴为您服务。有什么可以帮助您的吗？',
      '天气': '抱歉，我无法获取实时天气信息。建议您查看天气预报应用或网站获取准确的天气信息。',
      '推荐': '根据您的需求，我推荐您可以尝试一些热门应用或服务。如果您能提供更具体的要求，我可以给出更精准的建议。',
      '学习': '学习是一个持续的过程！建议您制定明确的学习目标，找到适合自己的学习方法，保持耐心和坚持。',
      '健康': '健康生活很重要！建议您保持规律作息，均衡饮食，适量运动，定期体检。',
      '编程': '编程学习建议从基础开始，选择一门入门语言如Python，通过项目实践来提升技能。',
      '工作': '工作中保持积极态度，善于沟通，持续学习新技能，这些都是职场成功的重要因素。',
      '帮助': '我可以帮助您解答各种问题，包括学习、工作、生活等方面的建议。请随时向我提问！',
      '功能': '我支持文本对话、问题解答、建议提供等功能。您可以问我任何问题，我会尽力为您提供帮助。'
    };

    // 检查是否有匹配的预设回复
    for (let key in mockReplies) {
      if (message.includes(key)) {
        return mockReplies[key];
      }
    }

    // 通用回复
    const generalReplies = [
      '这是一个很有趣的问题！让我为您详细解答...',
      '感谢您的提问，我会尽力为您提供帮助。',
      '这个问题很有深度，让我从几个角度来分析...',
      '我理解您的疑问，让我为您提供一些建议...',
      '这是一个常见的问题，我来为您解答...',
      '您的问题很有意思，让我来帮您分析一下...',
      '感谢您的信任，我会认真回答您的问题...'
    ];

    return generalReplies[Math.floor(Math.random() * generalReplies.length)];
  },

  // 处理API错误
  handleAPIError(errorMsg) {
    const errorMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: '抱歉，我遇到了一些问题，请稍后再试。',
      time: this.getTimeString()
    };

    const newMessages = this.data.messages.concat([errorMessage]);
    
    this.setData({
      messages: newMessages,
      isSending: false
    });

    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });
  },

  // 滚动到最新消息
  scrollToLatestMessage() {
    if (this.data.messages.length > 0) {
      const lastMessage = this.data.messages[this.data.messages.length - 1];
      this.setData({
        scrollToMessage: `msg-${lastMessage.id}`
      });
    }
  },

  // 获取时间字符串
  getTimeString() {
    const now = new Date();
    return now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 清空对话
  clearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前对话吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            conversationId: ''
          });
        }
      }
    });
  },

  // 分享对话
  onShareAppMessage() {
    return {
      title: '智能对话助手',
      path: '/pages/chat/chat'
    };
  }
});

