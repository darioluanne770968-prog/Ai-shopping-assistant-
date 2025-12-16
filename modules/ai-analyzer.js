/**
 * AI购物助手 - AI分析模块
 * 评论分析、购买建议、商品真伪识别
 */

export class AIAnalyzer {
  constructor() {
    // 情感分析关键词
    this.positiveKeywords = [
      '好', '棒', '赞', '喜欢', '满意', '不错', '推荐', '值得', '划算',
      '正品', '快', '质量好', '物超所值', '很好', '非常好', '超级好',
      '完美', '优秀', '给力', '惊喜', '实用', '方便', '舒服', '合适'
    ];

    this.negativeKeywords = [
      '差', '烂', '垃圾', '失望', '后悔', '假货', '不好', '难用',
      '坏', '破', '退货', '投诉', '骗', '虚假', '慢', '态度差',
      '不值', '贵', '问题', '质量差', '不推荐', '不满意', '不行'
    ];

    this.fakeReviewPatterns = [
      /好评返现/,
      /五星好评/,
      /晒图返/,
      /复制.*评价/,
      /默认好评/,
      /(.)\1{4,}/, // 重复字符超过4个
    ];
  }

  /**
   * 获取购买建议
   */
  async getBuySuggestion(product) {
    try {
      // 综合评估
      const priceScore = await this.evaluatePrice(product);
      const shopScore = await this.evaluateShop(product);
      const reviewScore = await this.evaluateReviews(product);

      const totalScore = (priceScore + shopScore + reviewScore) / 3;

      let verdict = {
        recommend: false,
        neutral: false,
        notRecommend: false,
        reason: ''
      };

      if (totalScore >= 70) {
        verdict.recommend = true;
        verdict.reason = this.generatePositiveReason(priceScore, shopScore, reviewScore);
      } else if (totalScore >= 50) {
        verdict.neutral = true;
        verdict.reason = this.generateNeutralReason(priceScore, shopScore, reviewScore);
      } else {
        verdict.notRecommend = true;
        verdict.reason = this.generateNegativeReason(priceScore, shopScore, reviewScore);
      }

      return verdict;
    } catch (error) {
      console.error('生成购买建议失败:', error);
      return {
        neutral: true,
        reason: '暂无法提供建议，请自行判断'
      };
    }
  }

  /**
   * 评估价格
   */
  async evaluatePrice(product) {
    // 模拟价格评估逻辑
    // 实际应该对比历史价格和市场价格
    const priceLevel = Math.random();

    if (priceLevel < 0.3) return 85; // 低价
    if (priceLevel < 0.7) return 65; // 中等
    return 45; // 高价
  }

  /**
   * 评估店铺
   */
  async evaluateShop(product) {
    // 模拟店铺评估
    const shopLevel = Math.random();

    if (shopLevel > 0.7) return 90;
    if (shopLevel > 0.4) return 70;
    return 50;
  }

  /**
   * 评估评论
   */
  async evaluateReviews(product) {
    // 模拟评论评估
    const reviewLevel = Math.random();

    if (reviewLevel > 0.6) return 85;
    if (reviewLevel > 0.3) return 65;
    return 45;
  }

  /**
   * 生成正面建议理由
   */
  generatePositiveReason(priceScore, shopScore, reviewScore) {
    const reasons = [];

    if (priceScore >= 70) reasons.push('价格接近历史低点');
    if (shopScore >= 70) reasons.push('店铺信誉良好');
    if (reviewScore >= 70) reasons.push('用户口碑优秀');

    return reasons.join('，') + '，推荐购买！';
  }

  /**
   * 生成中性建议理由
   */
  generateNeutralReason(priceScore, shopScore, reviewScore) {
    const concerns = [];

    if (priceScore < 60) concerns.push('价格偏高');
    if (shopScore < 60) concerns.push('店铺评分一般');
    if (reviewScore < 60) concerns.push('存在部分差评');

    return concerns.length > 0
      ? `注意：${concerns.join('、')}，建议货比三家`
      : '综合表现中等，可根据需求决定';
  }

  /**
   * 生成负面建议理由
   */
  generateNegativeReason(priceScore, shopScore, reviewScore) {
    const issues = [];

    if (priceScore < 50) issues.push('价格虚高');
    if (shopScore < 50) issues.push('店铺信誉存疑');
    if (reviewScore < 50) issues.push('差评较多');

    return `警告：${issues.join('、')}，不建议购买`;
  }

  /**
   * 分析评论
   */
  async analyzeReviews(product) {
    try {
      // 模拟获取评论数据
      const reviews = await this.fetchReviews(product);

      // 情感分析
      const sentimentResult = this.analyzeSentiment(reviews);

      // 刷单检测
      const suspiciousReviews = this.detectFakeReviews(reviews);

      // 提取优缺点
      const { pros, cons } = this.extractProsAndCons(reviews);

      return {
        positive: sentimentResult.positive,
        neutral: sentimentResult.neutral,
        negative: sentimentResult.negative,
        suspiciousReviews: suspiciousReviews.length > reviews.length * 0.2,
        pros,
        cons,
        totalReviews: reviews.length,
        suspiciousCount: suspiciousReviews.length
      };
    } catch (error) {
      console.error('评论分析失败:', error);
      return {
        positive: 33,
        neutral: 34,
        negative: 33,
        suspiciousReviews: false,
        pros: ['暂无数据'],
        cons: ['暂无数据']
      };
    }
  }

  /**
   * 获取评论（模拟）
   */
  async fetchReviews(product) {
    // 实际应该从商品页面或API获取评论
    return [
      { content: '质量很好，物流很快，满意！', rating: 5 },
      { content: '东西不错，就是包装有点简陋', rating: 4 },
      { content: '一般般吧，没想象中那么好', rating: 3 },
      { content: '收到货发现有破损，已申请退货', rating: 1 },
      { content: '性价比很高，推荐购买', rating: 5 },
      { content: '好评返现10元，默认好评', rating: 5 },
      { content: '用了一周感觉还可以', rating: 4 },
      { content: '客服态度很好，解决问题很及时', rating: 5 }
    ];
  }

  /**
   * 情感分析
   */
  analyzeSentiment(reviews) {
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    reviews.forEach(review => {
      const score = this.calculateSentimentScore(review.content);

      if (score > 0.3) positive++;
      else if (score < -0.3) negative++;
      else neutral++;
    });

    const total = reviews.length || 1;

    return {
      positive: Math.round(positive / total * 100),
      neutral: Math.round(neutral / total * 100),
      negative: Math.round(negative / total * 100)
    };
  }

  /**
   * 计算情感分数
   */
  calculateSentimentScore(text) {
    let score = 0;

    this.positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 0.2;
    });

    this.negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) score -= 0.3;
    });

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * 检测刷单评论
   */
  detectFakeReviews(reviews) {
    return reviews.filter(review => {
      return this.fakeReviewPatterns.some(pattern =>
        pattern.test(review.content)
      );
    });
  }

  /**
   * 提取优缺点
   */
  extractProsAndCons(reviews) {
    const pros = new Set();
    const cons = new Set();

    const prosPatterns = [
      { pattern: /质量(很)?好/, text: '质量好' },
      { pattern: /物流(很)?快/, text: '物流快' },
      { pattern: /性价比(很)?高/, text: '性价比高' },
      { pattern: /包装(很)?(好|精美)/, text: '包装精美' },
      { pattern: /客服(态度)?(好|热情)/, text: '客服服务好' },
      { pattern: /正品/, text: '正品保障' },
      { pattern: /推荐/, text: '用户推荐' },
      { pattern: /实用/, text: '实用性强' }
    ];

    const consPatterns = [
      { pattern: /质量(不好|差|一般)/, text: '质量一般' },
      { pattern: /物流(慢|差)/, text: '物流慢' },
      { pattern: /包装(简陋|破损|差)/, text: '包装简陋' },
      { pattern: /贵|不值/, text: '价格偏高' },
      { pattern: /客服(态度差|不回复)/, text: '客服响应慢' },
      { pattern: /色差|颜色不对/, text: '有色差' },
      { pattern: /尺寸(不对|偏)/, text: '尺寸不准' }
    ];

    reviews.forEach(review => {
      prosPatterns.forEach(({ pattern, text }) => {
        if (pattern.test(review.content)) pros.add(text);
      });

      consPatterns.forEach(({ pattern, text }) => {
        if (pattern.test(review.content)) cons.add(text);
      });
    });

    return {
      pros: Array.from(pros).slice(0, 5),
      cons: Array.from(cons).slice(0, 5)
    };
  }

  /**
   * 分析店铺可信度
   */
  async analyzeShop(product) {
    try {
      // 模拟店铺分析
      const trustScore = Math.round(60 + Math.random() * 40);

      let level = '';
      if (trustScore >= 90) level = '非常可信';
      else if (trustScore >= 75) level = '比较可信';
      else if (trustScore >= 60) level = '一般';
      else level = '需谨慎';

      const warnings = [];

      // 模拟警告信息
      if (trustScore < 80) {
        const possibleWarnings = [
          { type: 'warning', icon: '⚠️', message: '店铺开店时间较短' },
          { type: 'warning', icon: '⚠️', message: '近期有售后纠纷' },
          { type: 'danger', icon: '🚨', message: '发现多条差评投诉' },
          { type: 'warning', icon: '⚠️', message: '商品详情信息不完整' }
        ];

        const numWarnings = Math.floor(Math.random() * 3);
        for (let i = 0; i < numWarnings; i++) {
          warnings.push(possibleWarnings[i]);
        }
      }

      return {
        trustScore,
        level,
        warnings,
        shopAge: `${Math.floor(Math.random() * 5) + 1}年`,
        responseRate: `${Math.floor(85 + Math.random() * 15)}%`,
        returnRate: `${(Math.random() * 5).toFixed(1)}%`
      };
    } catch (error) {
      console.error('店铺分析失败:', error);
      return {
        trustScore: 60,
        level: '暂无数据',
        warnings: []
      };
    }
  }

  /**
   * 商品真伪识别
   */
  async verifyAuthenticity(product) {
    // 综合多维度判断商品真伪
    const signals = {
      priceAnomaly: this.checkPriceAnomaly(product),
      shopCredibility: await this.checkShopCredibility(product),
      imageAuthenticity: await this.checkImageAuthenticity(product),
      descriptionQuality: this.checkDescriptionQuality(product)
    };

    let riskScore = 0;
    const riskFactors = [];

    if (signals.priceAnomaly) {
      riskScore += 30;
      riskFactors.push('价格异常偏低');
    }

    if (!signals.shopCredibility) {
      riskScore += 25;
      riskFactors.push('店铺信誉不足');
    }

    if (!signals.imageAuthenticity) {
      riskScore += 25;
      riskFactors.push('图片可能盗用');
    }

    if (!signals.descriptionQuality) {
      riskScore += 20;
      riskFactors.push('商品描述不规范');
    }

    return {
      isAuthentic: riskScore < 50,
      riskScore,
      riskFactors,
      recommendation: riskScore < 30
        ? '该商品可信度较高'
        : riskScore < 60
          ? '请仔细核实商品信息'
          : '存在较高风险，建议谨慎购买'
    };
  }

  /**
   * 检查价格异常
   */
  checkPriceAnomaly(product) {
    // 简化逻辑：如果价格低于某个阈值则认为异常
    // 实际应该对比市场价格
    return product.price < 10; // 示例阈值
  }

  /**
   * 检查店铺可信度
   */
  async checkShopCredibility(product) {
    // 模拟检查
    return Math.random() > 0.2;
  }

  /**
   * 检查图片真实性
   */
  async checkImageAuthenticity(product) {
    // 模拟检查
    return Math.random() > 0.1;
  }

  /**
   * 检查描述质量
   */
  checkDescriptionQuality(product) {
    // 检查标题是否包含过多营销词汇
    const marketingWords = /爆款|热卖|疯抢|秒杀|清仓|特价|限时/g;
    const matches = (product.title.match(marketingWords) || []).length;
    return matches < 3;
  }
}
