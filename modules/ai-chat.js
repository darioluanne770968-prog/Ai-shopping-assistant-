/**
 * AI购物助手 - AI对话模块
 * 智能问答、购物建议、商品推荐
 */

export class AIChat {
  constructor() {
    this.conversationHistory = [];
    this.productContext = null;

    // 预设问题模板
    this.questionTemplates = {
      suitability: [
        /适合(.+)吗/,
        /(.+)能用吗/,
        /(.+)合适吗/,
        /送给(.+)怎么样/
      ],
      recommendation: [
        /推荐(.+)/,
        /有什么(.+)推荐/,
        /帮我找(.+)/,
        /想买(.+)/
      ],
      comparison: [
        /(.+)和(.+)哪个好/,
        /对比(.+)/,
        /区别是什么/
      ],
      price: [
        /值不值/,
        /贵不贵/,
        /什么时候买/,
        /会降价吗/
      ]
    };

    // 用户画像标签
    this.userProfiles = {
      student: ['学生', '大学生', '学校'],
      elderly: ['老人', '父母', '爷爷', '奶奶', '老年人'],
      kids: ['孩子', '儿童', '小孩', '宝宝'],
      professional: ['办公', '工作', '专业'],
      gaming: ['游戏', '电竞', '玩'],
      sports: ['运动', '健身', '跑步']
    };
  }

  /**
   * 设置当前商品上下文
   */
  setProductContext(product) {
    this.productContext = product;
  }

  /**
   * 处理用户问题
   */
  async chat(userMessage) {
    // 添加到历史
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // 分析问题类型
    const questionType = this.analyzeQuestionType(userMessage);

    // 生成回答
    let response;
    switch (questionType) {
      case 'suitability':
        response = await this.handleSuitabilityQuestion(userMessage);
        break;
      case 'recommendation':
        response = await this.handleRecommendationQuestion(userMessage);
        break;
      case 'comparison':
        response = await this.handleComparisonQuestion(userMessage);
        break;
      case 'price':
        response = await this.handlePriceQuestion(userMessage);
        break;
      default:
        response = await this.handleGeneralQuestion(userMessage);
    }

    // 添加回答到历史
    this.conversationHistory.push({
      role: 'assistant',
      content: response.text,
      data: response.data,
      timestamp: Date.now()
    });

    return response;
  }

  /**
   * 分析问题类型
   */
  analyzeQuestionType(message) {
    for (const [type, patterns] of Object.entries(this.questionTemplates)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          return type;
        }
      }
    }
    return 'general';
  }

  /**
   * 处理适用性问题
   */
  async handleSuitabilityQuestion(message) {
    // 提取目标用户
    let targetUser = null;
    for (const [profile, keywords] of Object.entries(this.userProfiles)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          targetUser = { profile, keyword };
          break;
        }
      }
      if (targetUser) break;
    }

    if (!this.productContext) {
      return {
        text: '请先打开一个商品页面，我才能帮你分析是否适合哦~',
        type: 'info'
      };
    }

    // 分析商品与目标用户的匹配度
    const analysis = this.analyzeProductFit(this.productContext, targetUser);

    return {
      text: analysis.summary,
      type: analysis.suitable ? 'positive' : 'warning',
      data: {
        suitable: analysis.suitable,
        reasons: analysis.reasons,
        alternatives: analysis.alternatives
      }
    };
  }

  /**
   * 分析商品适配度
   */
  analyzeProductFit(product, targetUser) {
    const title = product.title.toLowerCase();
    const price = product.price;

    const reasons = [];
    let suitable = true;

    if (targetUser) {
      switch (targetUser.profile) {
        case 'elderly':
          // 老人适用性分析
          if (title.includes('游戏') || title.includes('电竞')) {
            suitable = false;
            reasons.push('这款产品偏向年轻用户，功能可能过于复杂');
          }
          if (price > 3000) {
            reasons.push('价格较高，建议选择性价比更高的款式');
          }
          if (title.includes('大屏') || title.includes('大字')) {
            reasons.push('大屏/大字体设计，适合老人使用');
          }
          break;

        case 'student':
          if (price > 2000) {
            reasons.push('价格偏高，学生可能预算有限');
          }
          if (title.includes('性价比') || title.includes('学生')) {
            reasons.push('这款针对学生群体设计，比较合适');
          }
          break;

        case 'kids':
          if (title.includes('儿童') || title.includes('护眼')) {
            reasons.push('专为儿童设计，安全性有保障');
          }
          if (!title.includes('儿童') && price > 500) {
            suitable = false;
            reasons.push('建议选择儿童专用产品');
          }
          break;

        case 'gaming':
          if (title.includes('游戏') || title.includes('电竞') || title.includes('高刷')) {
            reasons.push('游戏向产品，性能有保障');
          }
          break;
      }
    }

    if (reasons.length === 0) {
      reasons.push('这款产品适用性较广，可以考虑购买');
    }

    return {
      suitable,
      summary: suitable
        ? `✅ 这款${product.title.substring(0, 20)}...比较适合${targetUser?.keyword || '使用'}！${reasons.join('；')}`
        : `⚠️ 这款可能不太适合${targetUser?.keyword || ''}。${reasons.join('；')}`,
      reasons,
      alternatives: suitable ? [] : ['建议搜索"' + targetUser?.keyword + '专用"相关产品']
    };
  }

  /**
   * 处理推荐问题
   */
  async handleRecommendationQuestion(message) {
    // 提取需求关键词
    const priceMatch = message.match(/(\d+)元?以[下内]/);
    const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;

    const categoryMatch = message.match(/推荐[一个]?(.+?)(?:吗|呢|$)/);
    const category = categoryMatch ? categoryMatch[1] : null;

    // 生成推荐
    const recommendations = await this.generateRecommendations(category, maxPrice);

    return {
      text: `🎯 根据你的需求，我推荐以下${category || '商品'}：\n\n${recommendations.map((r, i) =>
        `${i + 1}. ${r.title}\n   💰 ¥${r.price} | ⭐ ${r.rating}`
      ).join('\n\n')}`,
      type: 'recommendation',
      data: { recommendations }
    };
  }

  /**
   * 生成推荐
   */
  async generateRecommendations(category, maxPrice) {
    // 模拟推荐数据
    return [
      {
        id: 'rec_1',
        title: `${category || '热门商品'} - 性价比之选`,
        price: maxPrice ? Math.floor(maxPrice * 0.7) : 299,
        rating: 4.8,
        reason: '销量高，评价好'
      },
      {
        id: 'rec_2',
        title: `${category || '精选商品'} - 品质之选`,
        price: maxPrice ? Math.floor(maxPrice * 0.9) : 499,
        rating: 4.9,
        reason: '品牌可靠，质量保证'
      },
      {
        id: 'rec_3',
        title: `${category || '特惠商品'} - 超值之选`,
        price: maxPrice ? Math.floor(maxPrice * 0.5) : 199,
        rating: 4.6,
        reason: '价格实惠，功能齐全'
      }
    ];
  }

  /**
   * 处理对比问题
   */
  async handleComparisonQuestion(message) {
    return {
      text: '📊 商品对比功能正在准备中...\n\n你可以在商品页面点击"添加对比"按钮，然后在对比面板查看详细对比。',
      type: 'info',
      data: { action: 'openComparison' }
    };
  }

  /**
   * 处理价格问题
   */
  async handlePriceQuestion(message) {
    if (!this.productContext) {
      return {
        text: '请先打开一个商品页面~',
        type: 'info'
      };
    }

    const priceAnalysis = await this.analyzePriceTiming(this.productContext);

    return {
      text: priceAnalysis.summary,
      type: priceAnalysis.recommendation === 'buy' ? 'positive' : 'warning',
      data: priceAnalysis
    };
  }

  /**
   * 分析购买时机
   */
  async analyzePriceTiming(product) {
    const currentPrice = product.price;

    // 模拟历史价格分析
    const historicalLow = currentPrice * 0.8;
    const historicalHigh = currentPrice * 1.3;
    const averagePrice = currentPrice * 1.05;

    const pricePosition = (currentPrice - historicalLow) / (historicalHigh - historicalLow);

    let recommendation, summary;

    if (pricePosition < 0.3) {
      recommendation = 'buy';
      summary = `🎉 现在是好价！当前¥${currentPrice}接近历史最低¥${historicalLow.toFixed(0)}，建议入手！`;
    } else if (pricePosition < 0.6) {
      recommendation = 'wait';
      summary = `🤔 价格一般。当前¥${currentPrice}，历史最低¥${historicalLow.toFixed(0)}。建议等等大促。`;
    } else {
      recommendation = 'avoid';
      summary = `⚠️ 现在价格偏高！当前¥${currentPrice}接近历史最高。强烈建议等降价。`;
    }

    // 预测下次降价
    const nextSale = this.predictNextSale();

    return {
      recommendation,
      summary: summary + `\n\n📅 预计${nextSale.name}(${nextSale.date})会有好价。`,
      currentPrice,
      historicalLow,
      historicalHigh,
      averagePrice,
      pricePosition,
      nextSale
    };
  }

  /**
   * 预测下次大促
   */
  predictNextSale() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const sales = [
      { name: '年货节', month: 1, day: 15 },
      { name: '38女王节', month: 3, day: 8 },
      { name: '618', month: 6, day: 18 },
      { name: '99大促', month: 9, day: 9 },
      { name: '双11', month: 11, day: 11 },
      { name: '双12', month: 12, day: 12 }
    ];

    for (const sale of sales) {
      if (month < sale.month || (month === sale.month && day < sale.day)) {
        return {
          name: sale.name,
          date: `${sale.month}月${sale.day}日`,
          daysLeft: this.calculateDaysLeft(year, sale.month, sale.day)
        };
      }
    }

    // 返回明年第一个
    return {
      name: sales[0].name,
      date: `${year + 1}年${sales[0].month}月${sales[0].day}日`,
      daysLeft: this.calculateDaysLeft(year + 1, sales[0].month, sales[0].day)
    };
  }

  /**
   * 计算剩余天数
   */
  calculateDaysLeft(year, month, day) {
    const target = new Date(year, month - 1, day);
    const now = new Date();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  /**
   * 处理通用问题
   */
  async handleGeneralQuestion(message) {
    // 简单的问答
    const responses = {
      '你好': '你好！我是AI购物助手，有什么可以帮你的？',
      '怎么用': '打开任意商品页面，我会自动显示比价信息。你也可以问我任何购物相关的问题！',
      '谢谢': '不客气！祝你购物愉快~ 🎉'
    };

    for (const [key, value] of Object.entries(responses)) {
      if (message.includes(key)) {
        return { text: value, type: 'info' };
      }
    }

    return {
      text: '🤔 我不太理解你的问题。你可以问我：\n\n• 这款适合老人吗？\n• 推荐一款500元以下的耳机\n• 现在买划算吗？\n• 什么时候降价？',
      type: 'help'
    };
  }

  /**
   * 获取对话历史
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * 清除对话历史
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * 获取快捷问题建议
   */
  getQuickQuestions() {
    const questions = [
      '现在买划算吗？',
      '什么时候会降价？',
      '这款质量怎么样？'
    ];

    if (this.productContext) {
      questions.unshift('这款适合送礼吗？');
    }

    return questions;
  }
}
