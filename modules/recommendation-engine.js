/**
 * AI购物助手 - 个性化推荐引擎
 * 基于用户行为的智能商品推荐
 */

export class RecommendationEngine {
  constructor(storage) {
    this.storage = storage;

    // 商品类别
    this.categories = [
      '数码电子', '手机配件', '电脑办公', '家用电器',
      '服装鞋帽', '美妆护肤', '食品饮料', '母婴用品',
      '运动户外', '家居家装', '图书文具', '汽车用品'
    ];

    // 价格区间
    this.priceRanges = [
      { min: 0, max: 50, label: '50元以下' },
      { min: 50, max: 100, label: '50-100元' },
      { min: 100, max: 300, label: '100-300元' },
      { min: 300, max: 500, label: '300-500元' },
      { min: 500, max: 1000, label: '500-1000元' },
      { min: 1000, max: 3000, label: '1000-3000元' },
      { min: 3000, max: Infinity, label: '3000元以上' }
    ];
  }

  /**
   * 记录用户行为
   */
  async recordBehavior(behavior) {
    const {
      type, // 'view', 'compare', 'wishlist', 'purchase'
      product,
      timestamp = new Date().toISOString()
    } = behavior;

    const result = await this.storage.storage.get('userBehaviors');
    const behaviors = result.userBehaviors || [];

    behaviors.unshift({
      type,
      productId: product.id,
      productTitle: product.title,
      category: this.detectCategory(product.title),
      price: product.price,
      platform: product.platform,
      timestamp
    });

    // 只保留最近1000条记录
    const trimmed = behaviors.slice(0, 1000);

    await this.storage.storage.set({ userBehaviors: trimmed });

    // 更新用户画像
    await this.updateUserProfile(behavior);
  }

  /**
   * 检测商品类别
   */
  detectCategory(title) {
    const keywords = {
      '数码电子': ['手机', '平板', '电脑', '相机', '耳机', '音箱', '充电'],
      '手机配件': ['手机壳', '贴膜', '数据线', '充电器', '支架'],
      '电脑办公': ['键盘', '鼠标', '显示器', 'U盘', '硬盘', '打印'],
      '家用电器': ['电视', '冰箱', '洗衣机', '空调', '微波炉'],
      '服装鞋帽': ['衣服', '裤子', '鞋', '帽子', 'T恤', '外套'],
      '美妆护肤': ['化妆', '护肤', '面膜', '口红', '香水'],
      '食品饮料': ['零食', '饮料', '茶', '咖啡', '坚果'],
      '母婴用品': ['奶粉', '纸尿裤', '玩具', '婴儿'],
      '运动户外': ['运动', '健身', '跑步', '户外', '瑜伽']
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (title.includes(word)) {
          return category;
        }
      }
    }

    return '其他';
  }

  /**
   * 更新用户画像
   */
  async updateUserProfile(behavior) {
    const result = await this.storage.storage.get('userProfile');
    const profile = result.userProfile || {
      categoryPreferences: {},
      pricePreferences: {},
      platformPreferences: {},
      viewHistory: [],
      lastUpdated: null
    };

    const category = this.detectCategory(behavior.product.title);
    const priceRange = this.getPriceRangeLabel(behavior.product.price);
    const platform = behavior.product.platform;

    // 更新类别偏好
    profile.categoryPreferences[category] =
      (profile.categoryPreferences[category] || 0) + this.getBehaviorWeight(behavior.type);

    // 更新价格偏好
    profile.pricePreferences[priceRange] =
      (profile.pricePreferences[priceRange] || 0) + this.getBehaviorWeight(behavior.type);

    // 更新平台偏好
    profile.platformPreferences[platform] =
      (profile.platformPreferences[platform] || 0) + this.getBehaviorWeight(behavior.type);

    // 更新浏览历史
    profile.viewHistory.unshift({
      productId: behavior.product.id,
      title: behavior.product.title,
      category,
      timestamp: behavior.timestamp
    });
    profile.viewHistory = profile.viewHistory.slice(0, 100);

    profile.lastUpdated = new Date().toISOString();

    await this.storage.storage.set({ userProfile: profile });
  }

  /**
   * 获取行为权重
   */
  getBehaviorWeight(type) {
    const weights = {
      view: 1,
      compare: 2,
      wishlist: 3,
      purchase: 5
    };
    return weights[type] || 1;
  }

  /**
   * 获取价格区间标签
   */
  getPriceRangeLabel(price) {
    for (const range of this.priceRanges) {
      if (price >= range.min && price < range.max) {
        return range.label;
      }
    }
    return '其他';
  }

  /**
   * 获取用户画像
   */
  async getUserProfile() {
    const result = await this.storage.storage.get('userProfile');
    return result.userProfile || null;
  }

  /**
   * 获取个性化推荐
   */
  async getRecommendations(count = 10) {
    const profile = await this.getUserProfile();

    if (!profile) {
      return this.getDefaultRecommendations(count);
    }

    // 获取用户偏好类别
    const topCategories = this.getTopItems(profile.categoryPreferences, 3);
    const topPriceRanges = this.getTopItems(profile.pricePreferences, 2);

    // 基于偏好生成推荐
    const recommendations = await this.generateRecommendations(
      topCategories,
      topPriceRanges,
      profile.viewHistory,
      count
    );

    return recommendations;
  }

  /**
   * 获取排名靠前的项目
   */
  getTopItems(preferences, count) {
    return Object.entries(preferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([key]) => key);
  }

  /**
   * 生成推荐列表
   */
  async generateRecommendations(categories, priceRanges, viewHistory, count) {
    const recommendations = [];

    // 基于类别推荐
    for (const category of categories) {
      const categoryRecs = await this.getRecommendationsForCategory(
        category,
        Math.ceil(count / categories.length)
      );
      recommendations.push(...categoryRecs);
    }

    // 基于浏览历史的"猜你喜欢"
    const relatedRecs = await this.getRelatedRecommendations(viewHistory, 3);
    recommendations.push(...relatedRecs);

    // 去重并限制数量
    const unique = this.deduplicateRecommendations(recommendations);

    return unique.slice(0, count).map(rec => ({
      ...rec,
      recommendReason: this.getRecommendReason(rec, categories, viewHistory)
    }));
  }

  /**
   * 获取类别推荐
   */
  async getRecommendationsForCategory(category, count) {
    // 模拟推荐数据
    return Array.from({ length: count }, (_, i) => ({
      id: `rec_${category}_${i}`,
      title: `${category}热销商品 ${i + 1}`,
      category,
      price: Math.floor(100 + Math.random() * 500),
      rating: (4 + Math.random()).toFixed(1),
      sales: Math.floor(1000 + Math.random() * 9000),
      image: 'https://via.placeholder.com/100',
      platform: ['淘宝', '京东', '拼多多'][Math.floor(Math.random() * 3)]
    }));
  }

  /**
   * 获取关联推荐
   */
  async getRelatedRecommendations(viewHistory, count) {
    if (viewHistory.length === 0) return [];

    const recentViews = viewHistory.slice(0, 5);
    const relatedCategories = [...new Set(recentViews.map(v => v.category))];

    const recommendations = [];
    for (const category of relatedCategories) {
      const rec = await this.getRecommendationsForCategory(category, 1);
      recommendations.push(...rec);
    }

    return recommendations.slice(0, count);
  }

  /**
   * 去重
   */
  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });
  }

  /**
   * 获取推荐理由
   */
  getRecommendReason(rec, userCategories, viewHistory) {
    if (userCategories.includes(rec.category)) {
      return `基于您对"${rec.category}"的兴趣`;
    }

    const recentView = viewHistory.find(v => v.category === rec.category);
    if (recentView) {
      return `与您浏览的"${recentView.title.substring(0, 15)}..."相关`;
    }

    return '热门推荐';
  }

  /**
   * 获取默认推荐
   */
  async getDefaultRecommendations(count) {
    const defaultCategories = ['数码电子', '美妆护肤', '服装鞋帽'];
    const recommendations = [];

    for (const category of defaultCategories) {
      const recs = await this.getRecommendationsForCategory(
        category,
        Math.ceil(count / defaultCategories.length)
      );
      recommendations.push(...recs.map(r => ({
        ...r,
        recommendReason: '热门商品'
      })));
    }

    return recommendations.slice(0, count);
  }

  /**
   * 获取"看了又看"推荐
   */
  async getAlsoViewedRecommendations(productId, count = 5) {
    // 模拟"看了又看"推荐
    return Array.from({ length: count }, (_, i) => ({
      id: `also_viewed_${i}`,
      title: `相似商品推荐 ${i + 1}`,
      price: Math.floor(100 + Math.random() * 300),
      rating: (4 + Math.random()).toFixed(1),
      image: 'https://via.placeholder.com/100',
      recommendReason: '看过这个商品的人还看了'
    }));
  }

  /**
   * 获取"买了又买"推荐
   */
  async getAlsoBoughtRecommendations(productId, count = 5) {
    // 模拟"买了又买"推荐
    return Array.from({ length: count }, (_, i) => ({
      id: `also_bought_${i}`,
      title: `搭配推荐 ${i + 1}`,
      price: Math.floor(50 + Math.random() * 200),
      rating: (4 + Math.random()).toFixed(1),
      image: 'https://via.placeholder.com/100',
      recommendReason: '买过这个商品的人还买了'
    }));
  }

  /**
   * 获取今日推荐
   */
  async getDailyRecommendations() {
    const profile = await this.getUserProfile();
    const recommendations = await this.getRecommendations(6);

    // 添加每日特惠
    const dailyDeals = await this.getDailyDeals(3);

    return {
      personalized: recommendations,
      dailyDeals,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取每日特惠
   */
  async getDailyDeals(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `daily_deal_${i}`,
      title: `今日特惠商品 ${i + 1}`,
      originalPrice: Math.floor(200 + Math.random() * 500),
      currentPrice: Math.floor(100 + Math.random() * 200),
      discount: Math.floor(30 + Math.random() * 40),
      image: 'https://via.placeholder.com/100',
      endsIn: Math.floor(Math.random() * 24) + 1,
      recommendReason: '限时特惠'
    }));
  }

  /**
   * 清除用户数据
   */
  async clearUserData() {
    await this.storage.storage.remove(['userBehaviors', 'userProfile']);
  }
}
