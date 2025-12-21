/**
 * AI购物助手 - 购物心理分析与防冲动消费模块
 * 分析用户消费心理，防止冲动消费
 */

export class ShoppingPsychologyAnalyzer {
  constructor(storage) {
    this.storage = storage;

    // 消费心理类型
    this.psychologyTypes = {
      rational: { name: '理性型', icon: '🧠', description: '深思熟虑，注重性价比' },
      impulsive: { name: '冲动型', icon: '⚡', description: '容易被促销吸引，冲动下单' },
      collector: { name: '囤货型', icon: '📦', description: '喜欢囤货，担心涨价' },
      social: { name: '社交型', icon: '👥', description: '容易被种草，跟风购买' },
      emotional: { name: '情绪型', icon: '💭', description: '心情不好时购物解压' },
      hunter: { name: '猎人型', icon: '🎯', description: '喜欢找折扣，追求最低价' }
    };

    // 冲动消费触发因素
    this.impulseTriggers = [
      { name: '限时促销', weight: 0.3, icon: '⏰' },
      { name: '库存紧张', weight: 0.25, icon: '🔥' },
      { name: '社交推荐', weight: 0.2, icon: '👥' },
      { name: '情绪波动', weight: 0.15, icon: '😤' },
      { name: '深夜购物', weight: 0.1, icon: '🌙' }
    ];
  }

  /**
   * 分析用户消费心理画像
   */
  async analyzeUserPsychology() {
    const behaviors = await this.getUserBehaviors();
    const purchases = await this.getPurchaseHistory();

    const analysis = {
      timestamp: new Date().toISOString(),
      primaryType: null,
      secondaryType: null,
      scores: {},
      traits: [],
      riskFactors: [],
      suggestions: []
    };

    // 计算各类型得分
    analysis.scores = this.calculateTypeScores(behaviors, purchases);

    // 确定主要和次要类型
    const sortedTypes = Object.entries(analysis.scores)
      .sort((a, b) => b[1] - a[1]);

    analysis.primaryType = this.psychologyTypes[sortedTypes[0][0]];
    analysis.secondaryType = this.psychologyTypes[sortedTypes[1][0]];

    // 分析具体特征
    analysis.traits = this.analyzeTraits(behaviors, purchases);

    // 识别风险因素
    analysis.riskFactors = this.identifyRiskFactors(behaviors, purchases);

    // 生成个性化建议
    analysis.suggestions = this.generateSuggestions(analysis);

    return analysis;
  }

  /**
   * 获取用户行为数据
   */
  async getUserBehaviors() {
    const result = await this.storage.storage.get('userBehaviors');
    return result.userBehaviors || [];
  }

  /**
   * 获取购买历史
   */
  async getPurchaseHistory() {
    const result = await this.storage.storage.get('purchaseHistory');
    return result.purchaseHistory || [];
  }

  /**
   * 计算各心理类型得分
   */
  calculateTypeScores(behaviors, purchases) {
    const scores = {
      rational: 50,
      impulsive: 50,
      collector: 50,
      social: 50,
      emotional: 50,
      hunter: 50
    };

    // 分析浏览行为
    behaviors.forEach(b => {
      // 长时间浏览 -> 理性
      if (b.duration > 300) scores.rational += 2;

      // 快速下单 -> 冲动
      if (b.type === 'purchase' && b.timeToDecision < 60) scores.impulsive += 5;

      // 同类商品多次浏览 -> 猎人
      if (b.type === 'compare') scores.hunter += 3;
    });

    // 分析购买历史
    purchases.forEach(p => {
      // 促销期间购买多 -> 猎人/冲动
      if (p.wasSale) {
        scores.hunter += 2;
        scores.impulsive += 1;
      }

      // 同类商品多次购买 -> 囤货
      if (p.repeatCategory) scores.collector += 3;

      // 深夜购买 -> 情绪/冲动
      const hour = new Date(p.timestamp).getHours();
      if (hour >= 23 || hour <= 5) {
        scores.emotional += 3;
        scores.impulsive += 2;
      }
    });

    // 归一化到0-100
    const max = Math.max(...Object.values(scores));
    Object.keys(scores).forEach(key => {
      scores[key] = Math.round((scores[key] / max) * 100);
    });

    return scores;
  }

  /**
   * 分析具体特征
   */
  analyzeTraits(behaviors, purchases) {
    const traits = [];

    // 计算平均决策时间
    const avgDecisionTime = this.calculateAvgDecisionTime(behaviors);
    if (avgDecisionTime < 120) {
      traits.push({
        icon: '⚡',
        name: '快速决策者',
        description: '平均决策时间较短，容易快速下单',
        risk: 'high'
      });
    } else if (avgDecisionTime > 600) {
      traits.push({
        icon: '🧠',
        name: '深思熟虑者',
        description: '会花较长时间比较和考虑',
        risk: 'low'
      });
    }

    // 购买时段分析
    const lateNightPurchases = purchases.filter(p => {
      const hour = new Date(p.timestamp).getHours();
      return hour >= 23 || hour <= 5;
    }).length;

    if (lateNightPurchases / purchases.length > 0.3) {
      traits.push({
        icon: '🌙',
        name: '深夜购物者',
        description: '经常在深夜下单，可能受情绪影响',
        risk: 'medium'
      });
    }

    // 退货率分析
    const returnRate = this.calculateReturnRate(purchases);
    if (returnRate > 0.2) {
      traits.push({
        icon: '📦',
        name: '高退货率',
        description: `退货率${(returnRate * 100).toFixed(0)}%，可能存在冲动消费`,
        risk: 'high'
      });
    }

    return traits;
  }

  /**
   * 计算平均决策时间
   */
  calculateAvgDecisionTime(behaviors) {
    const decisions = behaviors.filter(b => b.timeToDecision);
    if (decisions.length === 0) return 300; // 默认5分钟

    return decisions.reduce((sum, b) => sum + b.timeToDecision, 0) / decisions.length;
  }

  /**
   * 计算退货率
   */
  calculateReturnRate(purchases) {
    if (purchases.length === 0) return 0;
    const returns = purchases.filter(p => p.returned).length;
    return returns / purchases.length;
  }

  /**
   * 识别风险因素
   */
  identifyRiskFactors(behaviors, purchases) {
    const factors = [];

    // 分析最近的购买模式
    const recentPurchases = purchases.slice(0, 30);

    // 短期内大量购买
    const recentTotal = recentPurchases.reduce((sum, p) => sum + p.amount, 0);
    if (recentTotal > 5000) {
      factors.push({
        icon: '💸',
        name: '近期支出激增',
        severity: 'high',
        detail: `近期消费¥${recentTotal.toFixed(0)}，高于平常水平`
      });
    }

    // 促销期间购买占比
    const salePurchases = recentPurchases.filter(p => p.wasSale).length;
    if (salePurchases / recentPurchases.length > 0.7) {
      factors.push({
        icon: '🏷️',
        name: '促销敏感',
        severity: 'medium',
        detail: '大部分购买发生在促销期间，容易被促销吸引'
      });
    }

    return factors;
  }

  /**
   * 生成个性化建议
   */
  generateSuggestions(analysis) {
    const suggestions = [];

    // 基于主要类型的建议
    switch (analysis.primaryType?.name) {
      case '冲动型':
        suggestions.push({
          icon: '⏰',
          title: '72小时冷静期',
          content: '大额购买前等待72小时，确认真的需要再下单'
        });
        suggestions.push({
          icon: '📝',
          title: '制定购物清单',
          content: '提前列出需要买的东西，按清单购物'
        });
        break;

      case '囤货型':
        suggestions.push({
          icon: '📦',
          title: '检查库存',
          content: '购买前检查家里是否还有存货'
        });
        suggestions.push({
          icon: '📅',
          title: '保质期提醒',
          content: '注意商品保质期，避免过期浪费'
        });
        break;

      case '情绪型':
        suggestions.push({
          icon: '🧘',
          title: '情绪管理',
          content: '心情不好时先冷静，购物不是最好的解压方式'
        });
        suggestions.push({
          icon: '🌙',
          title: '避免深夜下单',
          content: '深夜判断力下降，第二天再决定'
        });
        break;
    }

    // 通用建议
    suggestions.push({
      icon: '💰',
      title: '设置预算',
      content: '为每月购物设置预算上限'
    });

    return suggestions;
  }

  /**
   * 购买前冷静检查
   */
  async cooldownCheck(product) {
    const checks = [];
    let shouldBuy = true;
    let waitTime = 0;

    // 1. 价格检查
    if (product.price > 500) {
      checks.push({
        icon: '💰',
        question: '这个价格在预算内吗？',
        tip: '大额消费建议等待24小时再决定'
      });
      waitTime = Math.max(waitTime, 24);
    }

    // 2. 需求检查
    checks.push({
      icon: '🤔',
      question: '这是"需要"还是"想要"？',
      tip: '区分必需品和欲望，优先满足需要'
    });

    // 3. 替代品检查
    checks.push({
      icon: '🔄',
      question: '家里有类似的东西吗？',
      tip: '检查是否已有可替代的物品'
    });

    // 4. 时机检查
    const upcomingSale = await this.checkUpcomingSale();
    if (upcomingSale) {
      checks.push({
        icon: '📅',
        question: `${upcomingSale.name}快到了，要等等吗？`,
        tip: `还有${upcomingSale.daysUntil}天，可能有更大优惠`
      });
      shouldBuy = false;
    }

    // 5. 情绪检查
    const hour = new Date().getHours();
    if (hour >= 23 || hour <= 5) {
      checks.push({
        icon: '🌙',
        question: '现在是深夜，判断力可能下降',
        tip: '建议明天白天再决定'
      });
      shouldBuy = false;
      waitTime = Math.max(waitTime, 8);
    }

    return {
      checks,
      recommendation: shouldBuy ? 'proceed' : 'wait',
      suggestedWaitHours: waitTime,
      message: shouldBuy
        ? '通过冷静检查，可以考虑购买'
        : `建议等待${waitTime}小时后再决定`
    };
  }

  /**
   * 检查即将到来的大促
   */
  async checkUpcomingSale() {
    // 简化实现，检查是否有近期大促
    const now = new Date();
    const sales = [
      { name: '618', month: 6, day: 18 },
      { name: '双11', month: 11, day: 11 },
      { name: '双12', month: 12, day: 12 }
    ];

    for (const sale of sales) {
      const saleDate = new Date(now.getFullYear(), sale.month - 1, sale.day);
      const daysUntil = Math.ceil((saleDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntil > 0 && daysUntil <= 14) {
        return { ...sale, daysUntil };
      }
    }

    return null;
  }

  /**
   * 生成消费心理报告
   */
  async generatePsychologyReport() {
    const analysis = await this.analyzeUserPsychology();

    let report = `🧠 消费心理分析报告\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `📊 你的消费类型：\n`;
    report += `主要类型: ${analysis.primaryType.icon} ${analysis.primaryType.name}\n`;
    report += `${analysis.primaryType.description}\n\n`;
    report += `次要类型: ${analysis.secondaryType.icon} ${analysis.secondaryType.name}\n\n`;

    if (analysis.traits.length > 0) {
      report += `🔍 消费特征：\n`;
      analysis.traits.forEach(trait => {
        report += `${trait.icon} ${trait.name}: ${trait.description}\n`;
      });
      report += `\n`;
    }

    if (analysis.riskFactors.length > 0) {
      report += `⚠️ 风险提示：\n`;
      analysis.riskFactors.forEach(factor => {
        report += `${factor.icon} ${factor.name}: ${factor.detail}\n`;
      });
      report += `\n`;
    }

    report += `💡 个性化建议：\n`;
    analysis.suggestions.forEach(suggestion => {
      report += `${suggestion.icon} ${suggestion.title}\n`;
      report += `   ${suggestion.content}\n`;
    });

    return report;
  }
}
