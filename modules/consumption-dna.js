/**
 * AI购物助手 - 消费DNA报告模块
 * 年度消费大数据分析、购物画像、消费习惯洞察
 */

export class ConsumptionDNA {
  constructor() {
    this.purchaseHistory = [];
    this.userProfile = null;

    // 消费者类型定义
    this.consumerTypes = {
      rational: {
        name: '理性消费者',
        icon: '🧠',
        traits: ['比价意识强', '决策周期长', '注重性价比'],
        tips: '您的消费习惯很健康，继续保持'
      },
      impulsive: {
        name: '冲动型选手',
        icon: '⚡',
        traits: ['快速决策', '容易被促销吸引', '购物频繁'],
        tips: '建议使用购物车冷静期功能'
      },
      qualitySeeker: {
        name: '品质追求者',
        icon: '💎',
        traits: ['偏好高端品牌', '注重产品质量', '不太敏感价格'],
        tips: '关注限量版和新品发布'
      },
      bargainHunter: {
        name: '优惠猎手',
        icon: '🎯',
        traits: ['极度价格敏感', '擅长找优惠', '等待最低价'],
        tips: '设置更多价格提醒'
      },
      loyalFan: {
        name: '品牌忠粉',
        icon: '❤️',
        traits: ['品牌忠诚度高', '复购率高', '关注品牌动态'],
        tips: '探索您喜爱品牌的新品线'
      },
      techEnthusiast: {
        name: '科技发烧友',
        icon: '🔧',
        traits: ['追求最新科技', '愿意尝鲜', '关注参数'],
        tips: '关注数码新品首发'
      },
      aesthetic: {
        name: '颜值主义者',
        icon: '🎨',
        traits: ['注重设计感', '追求美观', '愿为设计买单'],
        tips: '关注设计师联名款'
      },
      practical: {
        name: '实用主义者',
        icon: '🔨',
        traits: ['功能导向', '注重耐用性', '不追求时尚'],
        tips: '关注用户真实评价'
      }
    };

    // 消费标签
    this.consumptionTags = {
      categories: {
        fashionista: { name: '时尚达人', minSpend: 5000, category: 'clothing' },
        techGeek: { name: '数码极客', minSpend: 8000, category: 'electronics' },
        beautyQueen: { name: '美妆博主', minSpend: 3000, category: 'cosmetics' },
        homeLover: { name: '居家专家', minSpend: 5000, category: 'home' },
        foodie: { name: '美食家', minSpend: 2000, category: 'food' },
        babyExpert: { name: '育儿专家', minSpend: 5000, category: 'baby' }
      },
      behaviors: {
        nightOwl: { name: '深夜剁手党', condition: 'lateNightPurchases > 30%' },
        earlyBird: { name: '早起抢购王', condition: 'morningPurchases > 30%' },
        festivalHunter: { name: '大促常客', condition: 'festivalPurchases > 40%' },
        newProductChaser: { name: '新品尝鲜者', condition: 'newProductRate > 30%' },
        returnMaster: { name: '退货小能手', condition: 'returnRate > 20%' }
      }
    };
  }

  /**
   * 生成年度消费DNA报告
   */
  async generateAnnualReport(year) {
    const purchases = await this.getPurchasesForYear(year);

    if (purchases.length === 0) {
      return { error: '该年度无消费记录' };
    }

    const report = {
      year,
      generatedAt: new Date().toISOString(),
      summary: this.calculateSummary(purchases),
      timeline: this.analyzeTimeline(purchases),
      categories: this.analyzeCategories(purchases),
      platforms: this.analyzePlatforms(purchases),
      brands: this.analyzeBrands(purchases),
      consumerType: this.determineConsumerType(purchases),
      tags: this.generateTags(purchases),
      insights: this.generateInsights(purchases),
      predictions: this.makePredictions(purchases),
      comparison: await this.compareWithPreviousYear(year, purchases),
      achievements: this.calculateAchievements(purchases),
      funFacts: this.generateFunFacts(purchases)
    };

    await this.saveReport(report);
    return report;
  }

  /**
   * 计算消费总览
   */
  calculateSummary(purchases) {
    const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);
    const totalItems = purchases.length;
    const avgOrderValue = totalSpent / totalItems;

    // 计算节省金额
    const totalSaved = purchases.reduce((sum, p) => {
      const discount = p.originalPrice ? p.originalPrice - p.price : 0;
      return sum + discount;
    }, 0);

    // 最大单笔消费
    const maxPurchase = purchases.reduce((max, p) =>
      p.price > max.price ? p : max, purchases[0]);

    // 消费天数
    const uniqueDays = new Set(purchases.map(p =>
      new Date(p.date).toDateString())).size;

    return {
      totalSpent: Math.round(totalSpent),
      totalItems,
      avgOrderValue: Math.round(avgOrderValue),
      totalSaved: Math.round(totalSaved),
      savingsRate: ((totalSaved / (totalSpent + totalSaved)) * 100).toFixed(1) + '%',
      maxPurchase: {
        title: maxPurchase.title,
        price: maxPurchase.price,
        date: maxPurchase.date
      },
      shoppingDays: uniqueDays,
      avgDailySpend: Math.round(totalSpent / 365)
    };
  }

  /**
   * 分析消费时间线
   */
  analyzeTimeline(purchases) {
    // 按月统计
    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { count: 0, amount: 0 };
    }

    // 按小时统计
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = 0;
    }

    // 按星期统计
    const weekdayData = {
      0: { name: '周日', count: 0 },
      1: { name: '周一', count: 0 },
      2: { name: '周二', count: 0 },
      3: { name: '周三', count: 0 },
      4: { name: '周四', count: 0 },
      5: { name: '周五', count: 0 },
      6: { name: '周六', count: 0 }
    };

    purchases.forEach(p => {
      const date = new Date(p.date);
      const month = date.getMonth() + 1;
      const hour = date.getHours();
      const weekday = date.getDay();

      monthlyData[month].count++;
      monthlyData[month].amount += p.price;
      hourlyData[hour]++;
      weekdayData[weekday].count++;
    });

    // 找出消费高峰
    const peakMonth = Object.entries(monthlyData)
      .sort((a, b) => b[1].amount - a[1].amount)[0];
    const peakHour = Object.entries(hourlyData)
      .sort((a, b) => b[1] - a[1])[0];
    const peakWeekday = Object.entries(weekdayData)
      .sort((a, b) => b[1].count - a[1].count)[0];

    return {
      monthly: monthlyData,
      hourly: hourlyData,
      weekday: weekdayData,
      peaks: {
        month: { month: parseInt(peakMonth[0]), amount: peakMonth[1].amount },
        hour: { hour: parseInt(peakHour[0]), count: peakHour[1] },
        weekday: { day: weekdayData[peakWeekday[0]].name, count: peakWeekday[1].count }
      }
    };
  }

  /**
   * 分析消费类别
   */
  analyzeCategories(purchases) {
    const categories = {};

    purchases.forEach(p => {
      const cat = p.category || '其他';
      if (!categories[cat]) {
        categories[cat] = { count: 0, amount: 0, items: [] };
      }
      categories[cat].count++;
      categories[cat].amount += p.price;
      categories[cat].items.push(p.title);
    });

    // 计算占比并排序
    const totalAmount = Object.values(categories)
      .reduce((sum, c) => sum + c.amount, 0);

    const sorted = Object.entries(categories)
      .map(([name, data]) => ({
        name,
        ...data,
        percentage: ((data.amount / totalAmount) * 100).toFixed(1) + '%'
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      breakdown: sorted,
      top3: sorted.slice(0, 3).map(c => c.name),
      diversityScore: this.calculateDiversityScore(sorted)
    };
  }

  /**
   * 计算消费多样性得分
   */
  calculateDiversityScore(categories) {
    const total = categories.reduce((sum, c) => sum + c.amount, 0);
    const entropy = categories.reduce((sum, c) => {
      const p = c.amount / total;
      return sum - (p > 0 ? p * Math.log2(p) : 0);
    }, 0);

    const maxEntropy = Math.log2(categories.length);
    return maxEntropy > 0 ? ((entropy / maxEntropy) * 100).toFixed(0) : 0;
  }

  /**
   * 分析购物平台
   */
  analyzePlatforms(purchases) {
    const platforms = {};

    purchases.forEach(p => {
      const platform = p.platform || '其他';
      if (!platforms[platform]) {
        platforms[platform] = { count: 0, amount: 0 };
      }
      platforms[platform].count++;
      platforms[platform].amount += p.price;
    });

    const sorted = Object.entries(platforms)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);

    return {
      breakdown: sorted,
      favorite: sorted[0]?.name,
      loyaltyScore: this.calculatePlatformLoyalty(sorted)
    };
  }

  /**
   * 计算平台忠诚度
   */
  calculatePlatformLoyalty(platforms) {
    if (platforms.length === 0) return 0;

    const totalAmount = platforms.reduce((sum, p) => sum + p.amount, 0);
    const topPlatformShare = platforms[0].amount / totalAmount;

    return (topPlatformShare * 100).toFixed(0);
  }

  /**
   * 分析品牌偏好
   */
  analyzeBrands(purchases) {
    const brands = {};

    purchases.forEach(p => {
      const brand = this.extractBrand(p.title) || '其他品牌';
      if (!brands[brand]) {
        brands[brand] = { count: 0, amount: 0 };
      }
      brands[brand].count++;
      brands[brand].amount += p.price;
    });

    const sorted = Object.entries(brands)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      topBrands: sorted,
      brandDiversity: Object.keys(brands).length,
      favoriteClass: this.classifyBrandPreference(sorted)
    };
  }

  /**
   * 提取品牌
   */
  extractBrand(title) {
    const brands = [
      'Apple', 'Nike', 'Adidas', '小米', '华为', 'Samsung',
      'Uniqlo', 'Zara', 'H&M', '优衣库',
      'Dyson', '戴森', 'SK-II', '兰蔻', '雅诗兰黛',
      '宜家', 'IKEA', '无印良品', 'Muji'
    ];

    for (const brand of brands) {
      if (title.toLowerCase().includes(brand.toLowerCase())) {
        return brand;
      }
    }
    return null;
  }

  /**
   * 分类品牌偏好
   */
  classifyBrandPreference(brands) {
    const luxuryBrands = ['Gucci', 'LV', 'Chanel', 'Hermes'];
    const midBrands = ['Nike', 'Adidas', 'Apple', 'Dyson'];
    const valueBrands = ['小米', 'Uniqlo', '优衣库', 'IKEA'];

    let luxuryCount = 0, midCount = 0, valueCount = 0;

    brands.forEach(b => {
      if (luxuryBrands.some(lb => b.name.includes(lb))) luxuryCount++;
      if (midBrands.some(mb => b.name.includes(mb))) midCount++;
      if (valueBrands.some(vb => b.name.includes(vb))) valueCount++;
    });

    if (luxuryCount >= midCount && luxuryCount >= valueCount) {
      return '奢华品味';
    } else if (midCount >= valueCount) {
      return '品质生活';
    } else {
      return '精打细算';
    }
  }

  /**
   * 确定消费者类型
   */
  determineConsumerType(purchases) {
    const metrics = this.calculateMetrics(purchases);
    let scores = {};

    // 评估各类型得分
    for (const [type, config] of Object.entries(this.consumerTypes)) {
      scores[type] = 0;
    }

    // 基于决策速度
    if (metrics.avgDecisionTime < 24) {
      scores.impulsive += 30;
    } else if (metrics.avgDecisionTime > 72) {
      scores.rational += 30;
    }

    // 基于价格敏感度
    if (metrics.discountPurchaseRate > 0.6) {
      scores.bargainHunter += 40;
    }

    // 基于品牌忠诚度
    if (metrics.brandLoyalty > 0.5) {
      scores.loyalFan += 35;
    }

    // 基于品类偏好
    if (metrics.topCategory === 'electronics') {
      scores.techEnthusiast += 25;
    }
    if (metrics.avgPrice > 500) {
      scores.qualitySeeker += 20;
    }

    // 找出最高分类型
    const topType = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      primary: topType,
      ...this.consumerTypes[topType],
      scores,
      confidence: (scores[topType] / 100).toFixed(2)
    };
  }

  /**
   * 计算消费指标
   */
  calculateMetrics(purchases) {
    const discountPurchases = purchases.filter(p => p.originalPrice && p.originalPrice > p.price);

    // 品牌忠诚度
    const brands = {};
    purchases.forEach(p => {
      const brand = this.extractBrand(p.title);
      if (brand) {
        brands[brand] = (brands[brand] || 0) + 1;
      }
    });
    const topBrandCount = Math.max(...Object.values(brands), 0);
    const brandLoyalty = topBrandCount / purchases.length;

    // 平均价格
    const avgPrice = purchases.reduce((sum, p) => sum + p.price, 0) / purchases.length;

    // 主要类别
    const categories = {};
    purchases.forEach(p => {
      const cat = p.category || '其他';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    const topCategory = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      avgDecisionTime: 48, // 模拟数据
      discountPurchaseRate: discountPurchases.length / purchases.length,
      brandLoyalty,
      avgPrice,
      topCategory
    };
  }

  /**
   * 生成消费标签
   */
  generateTags(purchases) {
    const tags = [];
    const metrics = this.calculateMetrics(purchases);
    const timeline = this.analyzeTimeline(purchases);
    const categories = this.analyzeCategories(purchases);

    // 时间行为标签
    const lateNightCount = Object.entries(timeline.hourly)
      .filter(([h]) => parseInt(h) >= 22 || parseInt(h) < 6)
      .reduce((sum, [, count]) => sum + count, 0);

    if (lateNightCount / purchases.length > 0.3) {
      tags.push({ ...this.consumptionTags.behaviors.nightOwl, score: 90 });
    }

    // 类别标签
    for (const [tagId, config] of Object.entries(this.consumptionTags.categories)) {
      const catData = categories.breakdown.find(c =>
        c.name.toLowerCase().includes(config.category));
      if (catData && catData.amount >= config.minSpend) {
        tags.push({ id: tagId, ...config, amount: catData.amount });
      }
    }

    // 节日消费标签
    const festivalPurchases = purchases.filter(p => this.isFestivalPurchase(p.date));
    if (festivalPurchases.length / purchases.length > 0.4) {
      tags.push({ ...this.consumptionTags.behaviors.festivalHunter, score: 85 });
    }

    return tags.slice(0, 6); // 最多6个标签
  }

  /**
   * 判断是否节日消费
   */
  isFestivalPurchase(date) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // 主要购物节
    const festivals = [
      { month: 6, days: [1, 18] }, // 618
      { month: 11, days: [1, 11] }, // 双11
      { month: 12, days: [12] }, // 双12
      { month: 1, days: [1] } // 元旦
    ];

    return festivals.some(f =>
      f.month === month && f.days.some(fd => Math.abs(fd - day) <= 3));
  }

  /**
   * 生成消费洞察
   */
  generateInsights(purchases) {
    const insights = [];
    const summary = this.calculateSummary(purchases);
    const timeline = this.analyzeTimeline(purchases);
    const categories = this.analyzeCategories(purchases);

    // 消费趋势洞察
    if (summary.totalSpent > 50000) {
      insights.push({
        type: 'spending',
        icon: '💰',
        title: '年度消费达人',
        content: `全年消费¥${summary.totalSpent}，日均¥${summary.avgDailySpend}`
      });
    }

    // 节省洞察
    if (parseFloat(summary.savingsRate) > 20) {
      insights.push({
        type: 'savings',
        icon: '🎉',
        title: '省钱小能手',
        content: `全年省下¥${summary.totalSaved}，省钱率${summary.savingsRate}`
      });
    }

    // 时间洞察
    const peakHour = timeline.peaks.hour.hour;
    if (peakHour >= 22 || peakHour < 6) {
      insights.push({
        type: 'behavior',
        icon: '🌙',
        title: '深夜剁手习惯',
        content: `您最常在${peakHour}点购物，注意休息哦`
      });
    }

    // 类别洞察
    const topCat = categories.breakdown[0];
    if (topCat) {
      insights.push({
        type: 'category',
        icon: '📊',
        title: `${topCat.name}爱好者`,
        content: `${topCat.name}消费¥${Math.round(topCat.amount)}，占比${topCat.percentage}`
      });
    }

    return insights;
  }

  /**
   * 消费预测
   */
  makePredictions(purchases) {
    const monthlyTrend = this.analyzeTimeline(purchases).monthly;
    const avgMonthlySpend = Object.values(monthlyTrend)
      .reduce((sum, m) => sum + m.amount, 0) / 12;

    // 预测下年消费
    const predictedAnnual = avgMonthlySpend * 12 * 1.05; // 假设5%增长

    // 预测高峰月
    const peakMonths = Object.entries(monthlyTrend)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 3)
      .map(([m]) => parseInt(m));

    return {
      nextYearSpend: Math.round(predictedAnnual),
      peakMonths,
      suggestedBudget: Math.round(avgMonthlySpend * 0.9), // 建议月预算
      savingsPotential: Math.round(predictedAnnual * 0.15)
    };
  }

  /**
   * 与上年对比
   */
  async compareWithPreviousYear(year, currentPurchases) {
    const prevPurchases = await this.getPurchasesForYear(year - 1);

    if (prevPurchases.length === 0) {
      return null;
    }

    const currentTotal = currentPurchases.reduce((sum, p) => sum + p.price, 0);
    const prevTotal = prevPurchases.reduce((sum, p) => sum + p.price, 0);

    const change = ((currentTotal - prevTotal) / prevTotal) * 100;

    return {
      previousYear: year - 1,
      previousTotal: Math.round(prevTotal),
      currentTotal: Math.round(currentTotal),
      change: change.toFixed(1) + '%',
      direction: change > 0 ? 'increase' : 'decrease',
      itemsChange: currentPurchases.length - prevPurchases.length
    };
  }

  /**
   * 计算成就
   */
  calculateAchievements(purchases) {
    const achievements = [];
    const summary = this.calculateSummary(purchases);

    if (summary.totalItems >= 100) {
      achievements.push({
        icon: '🏆',
        title: '百单成就',
        description: `全年下单${summary.totalItems}次`
      });
    }

    if (summary.totalSaved >= 1000) {
      achievements.push({
        icon: '💎',
        title: '省钱达人',
        description: `累计省下¥${summary.totalSaved}`
      });
    }

    if (summary.shoppingDays >= 100) {
      achievements.push({
        icon: '📅',
        title: '购物日历',
        description: `${summary.shoppingDays}天有购物记录`
      });
    }

    return achievements;
  }

  /**
   * 生成趣味数据
   */
  generateFunFacts(purchases) {
    const summary = this.calculateSummary(purchases);
    const facts = [];

    // 消费换算
    facts.push({
      icon: '☕',
      fact: `您的消费可以买${Math.floor(summary.totalSpent / 30)}杯咖啡`
    });

    facts.push({
      icon: '✈️',
      fact: `相当于${Math.floor(summary.totalSpent / 3000)}次国内游`
    });

    // 快递估算
    facts.push({
      icon: '📦',
      fact: `预计收了${summary.totalItems}个快递`
    });

    // 时间估算
    facts.push({
      icon: '⏰',
      fact: `如果每单花10分钟挑选，共花${Math.round(summary.totalItems * 10 / 60)}小时购物`
    });

    return facts;
  }

  /**
   * 获取指定年份的消费记录
   */
  async getPurchasesForYear(year) {
    return new Promise(resolve => {
      chrome.storage.local.get(['purchaseHistory'], result => {
        const allPurchases = result.purchaseHistory || [];
        const filtered = allPurchases.filter(p => {
          const d = new Date(p.date);
          return d.getFullYear() === year;
        });
        resolve(filtered);
      });
    });
  }

  /**
   * 保存报告
   */
  async saveReport(report) {
    return new Promise(resolve => {
      chrome.storage.local.get(['consumptionReports'], result => {
        const reports = result.consumptionReports || {};
        reports[report.year] = report;
        chrome.storage.local.set({ consumptionReports: reports }, resolve);
      });
    });
  }

  /**
   * 导出报告为图片
   */
  async exportReportAsImage(report) {
    // 简化实现 - 实际需要使用 html2canvas
    return {
      format: 'image/png',
      filename: `消费DNA报告_${report.year}.png`,
      data: null // 实际生成的图片数据
    };
  }
}
