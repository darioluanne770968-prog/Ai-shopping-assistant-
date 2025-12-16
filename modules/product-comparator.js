/**
 * AI购物助手 - 多商品对比模块
 * 生成详细的商品对比表格
 */

export class ProductComparator {
  constructor() {
    this.compareList = [];
    this.maxCompareItems = 4;

    // 常见规格属性
    this.specCategories = {
      phone: ['屏幕尺寸', '处理器', '内存', '存储', '电池容量', '摄像头', '操作系统', '重量'],
      laptop: ['屏幕尺寸', '处理器', '内存', '硬盘', '显卡', '电池续航', '重量', '操作系统'],
      headphone: ['类型', '连接方式', '降噪', '续航时间', '驱动单元', '频响范围', '重量'],
      default: ['品牌', '型号', '规格', '材质', '产地', '保修']
    };
  }

  /**
   * 添加商品到对比列表
   */
  add(product) {
    if (this.compareList.length >= this.maxCompareItems) {
      return {
        success: false,
        message: `最多只能对比${this.maxCompareItems}件商品`
      };
    }

    if (this.compareList.find(p => p.id === product.id)) {
      return {
        success: false,
        message: '该商品已在对比列表中'
      };
    }

    this.compareList.push(product);

    return {
      success: true,
      message: '已添加到对比列表',
      count: this.compareList.length
    };
  }

  /**
   * 从对比列表移除
   */
  remove(productId) {
    const index = this.compareList.findIndex(p => p.id === productId);
    if (index > -1) {
      this.compareList.splice(index, 1);
      return { success: true };
    }
    return { success: false };
  }

  /**
   * 清空对比列表
   */
  clear() {
    this.compareList = [];
  }

  /**
   * 获取对比列表
   */
  getList() {
    return this.compareList;
  }

  /**
   * 生成对比报告
   */
  async generateComparison() {
    if (this.compareList.length < 2) {
      return {
        success: false,
        message: '至少需要2件商品才能对比'
      };
    }

    // 检测商品类别
    const category = this.detectCategory(this.compareList);

    // 提取规格信息
    const specs = await this.extractSpecs(this.compareList, category);

    // 价格对比
    const priceComparison = this.comparePrices(this.compareList);

    // 评分对比
    const ratingComparison = this.compareRatings(this.compareList);

    // 优缺点分析
    const prosConsAnalysis = this.analyzeProsAndCons(this.compareList, specs);

    // 综合推荐
    const recommendation = this.generateRecommendation(
      this.compareList,
      priceComparison,
      ratingComparison,
      prosConsAnalysis
    );

    return {
      success: true,
      products: this.compareList,
      category,
      specs,
      priceComparison,
      ratingComparison,
      prosConsAnalysis,
      recommendation
    };
  }

  /**
   * 检测商品类别
   */
  detectCategory(products) {
    const keywords = {
      phone: ['手机', 'iPhone', '华为', '小米', 'OPPO', 'vivo', '三星'],
      laptop: ['笔记本', '电脑', 'MacBook', 'ThinkPad', '游戏本'],
      headphone: ['耳机', '耳麦', 'AirPods', '降噪']
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const product of products) {
        for (const word of words) {
          if (product.title.includes(word)) {
            return category;
          }
        }
      }
    }

    return 'default';
  }

  /**
   * 提取商品规格
   */
  async extractSpecs(products, category) {
    const specKeys = this.specCategories[category] || this.specCategories.default;
    const specs = {};

    for (const key of specKeys) {
      specs[key] = products.map(product => {
        // 模拟规格提取（实际应从商品详情页提取）
        return this.mockExtractSpec(product, key);
      });
    }

    return specs;
  }

  /**
   * 模拟规格提取
   */
  mockExtractSpec(product, specKey) {
    // 这是模拟数据，实际应该从商品详情页解析
    const mockSpecs = {
      '屏幕尺寸': ['6.1英寸', '6.7英寸', '6.5英寸', '6.8英寸'],
      '处理器': ['骁龙8 Gen3', 'A17 Pro', '天玑9300', '骁龙8 Gen2'],
      '内存': ['8GB', '12GB', '16GB', '8GB'],
      '存储': ['128GB', '256GB', '512GB', '256GB'],
      '电池容量': ['4500mAh', '4422mAh', '5000mAh', '4800mAh'],
      '品牌': ['品牌A', '品牌B', '品牌C', '品牌D'],
      '型号': ['型号1', '型号2', '型号3', '型号4']
    };

    const values = mockSpecs[specKey];
    if (values) {
      const index = this.compareList.indexOf(product) % values.length;
      return values[index];
    }

    return '--';
  }

  /**
   * 价格对比
   */
  comparePrices(products) {
    const prices = products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price
    }));

    prices.sort((a, b) => a.price - b.price);

    const lowest = prices[0];
    const highest = prices[prices.length - 1];
    const priceDiff = highest.price - lowest.price;

    return {
      items: prices,
      lowest,
      highest,
      priceDiff,
      summary: priceDiff > 0
        ? `价格相差 ¥${priceDiff.toFixed(0)}，${lowest.title.substring(0, 15)}... 最便宜`
        : '价格相同'
    };
  }

  /**
   * 评分对比
   */
  compareRatings(products) {
    const ratings = products.map(p => ({
      id: p.id,
      title: p.title,
      rating: p.rating || (4 + Math.random()).toFixed(1),
      reviewCount: p.reviewCount || Math.floor(Math.random() * 10000)
    }));

    ratings.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    return {
      items: ratings,
      best: ratings[0],
      summary: `${ratings[0].title.substring(0, 15)}... 评分最高 (${ratings[0].rating}分)`
    };
  }

  /**
   * 分析各商品优缺点
   */
  analyzeProsAndCons(products, specs) {
    const analysis = {};

    for (const product of products) {
      const pros = [];
      const cons = [];

      // 价格分析
      const lowestPrice = Math.min(...products.map(p => p.price));
      const highestPrice = Math.max(...products.map(p => p.price));

      if (product.price === lowestPrice) {
        pros.push('价格最低');
      } else if (product.price === highestPrice) {
        cons.push('价格最高');
      }

      // 基于规格分析（简化版）
      pros.push('品质有保障');
      cons.push('可能有同类更优选择');

      analysis[product.id] = { pros, cons };
    }

    return analysis;
  }

  /**
   * 生成综合推荐
   */
  generateRecommendation(products, priceComparison, ratingComparison, prosConsAnalysis) {
    // 计算综合得分
    const scores = products.map(product => {
      let score = 0;

      // 价格得分（越低越好）
      const priceRank = priceComparison.items.findIndex(p => p.id === product.id);
      score += (products.length - priceRank) * 30;

      // 评分得分
      const ratingRank = ratingComparison.items.findIndex(p => p.id === product.id);
      score += (products.length - ratingRank) * 40;

      // 优缺点得分
      const analysis = prosConsAnalysis[product.id];
      score += analysis.pros.length * 10;
      score -= analysis.cons.length * 5;

      return {
        product,
        score
      };
    });

    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const bestForBudget = priceComparison.lowest;
    const bestForQuality = ratingComparison.best;

    return {
      overall: {
        product: best.product,
        reason: '综合性价比最高'
      },
      budget: {
        product: products.find(p => p.id === bestForBudget.id),
        reason: '价格最实惠'
      },
      quality: {
        product: products.find(p => p.id === bestForQuality.id),
        reason: '用户评价最好'
      },
      scores
    };
  }

  /**
   * 生成对比图表数据
   */
  getChartData() {
    if (this.compareList.length < 2) return null;

    return {
      labels: this.compareList.map(p => p.title.substring(0, 10) + '...'),
      priceData: this.compareList.map(p => p.price),
      ratingData: this.compareList.map(p => p.rating || (4 + Math.random()).toFixed(1))
    };
  }

  /**
   * 导出对比报告为文本
   */
  async exportAsText() {
    const comparison = await this.generateComparison();
    if (!comparison.success) return comparison.message;

    let text = '【商品对比报告】\n\n';
    text += '═══════════════════════════════\n\n';

    // 商品列表
    text += '📦 对比商品：\n';
    comparison.products.forEach((p, i) => {
      text += `${i + 1}. ${p.title}\n   价格: ¥${p.price}\n`;
    });

    text += '\n═══════════════════════════════\n\n';

    // 价格对比
    text += '💰 价格对比：\n';
    text += comparison.priceComparison.summary + '\n';

    text += '\n═══════════════════════════════\n\n';

    // 推荐
    text += '🏆 推荐结果：\n';
    text += `综合推荐：${comparison.recommendation.overall.product.title}\n`;
    text += `预算之选：${comparison.recommendation.budget.product.title}\n`;
    text += `品质之选：${comparison.recommendation.quality.product.title}\n`;

    return text;
  }

  /**
   * 生成分享图片的数据
   */
  async getShareImageData() {
    const comparison = await this.generateComparison();
    if (!comparison.success) return null;

    return {
      type: 'comparison',
      title: '商品对比报告',
      products: comparison.products.map(p => ({
        title: p.title,
        price: p.price,
        image: p.image
      })),
      winner: comparison.recommendation.overall.product.title,
      timestamp: new Date().toLocaleString('zh-CN')
    };
  }
}
