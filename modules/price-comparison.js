/**
 * AI购物助手 - 价格比较模块
 * 多平台价格抓取和对比
 */

export class PriceComparison {
  constructor() {
    this.platforms = {
      taobao: {
        name: '淘宝',
        searchUrl: 'https://s.taobao.com/search?q=',
        color: '#ff5000'
      },
      tmall: {
        name: '天猫',
        searchUrl: 'https://list.tmall.com/search_product.htm?q=',
        color: '#ff0036'
      },
      jd: {
        name: '京东',
        searchUrl: 'https://search.jd.com/Search?keyword=',
        color: '#e1251b'
      },
      pdd: {
        name: '拼多多',
        searchUrl: 'https://mobile.yangkeduo.com/search_result.html?search_key=',
        color: '#e02e24'
      },
      suning: {
        name: '苏宁',
        searchUrl: 'https://search.suning.com/',
        color: '#f68b1e'
      },
      vipshop: {
        name: '唯品会',
        searchUrl: 'https://category.vip.com/suggest/',
        color: '#ff3192'
      },
      amazon: {
        name: '亚马逊',
        searchUrl: 'https://www.amazon.cn/s?k=',
        color: '#ff9900'
      },
      dangdang: {
        name: '当当',
        searchUrl: 'http://search.dangdang.com/?key=',
        color: '#e03b2b'
      }
    };

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 全网比价
   * @param {Object} product - 商品信息
   * @returns {Promise<Array>} - 各平台价格列表
   */
  async compare(product) {
    const cacheKey = this.getCacheKey(product);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const results = [];
    const searchKeyword = this.extractSearchKeyword(product.title);

    // 并行查询各平台
    const queries = Object.entries(this.platforms)
      .filter(([key]) => key !== product.platformKey)
      .map(([key, platform]) =>
        this.searchPlatform(key, platform, searchKeyword, product)
          .then(result => {
            if (result) results.push(result);
          })
          .catch(err => console.error(`${platform.name}查询失败:`, err))
      );

    await Promise.allSettled(queries);

    // 缓存结果
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: results
    });

    return results;
  }

  /**
   * 提取搜索关键词
   */
  extractSearchKeyword(title) {
    // 移除常见干扰词
    const removePatterns = [
      /【.*?】/g,
      /\[.*?\]/g,
      /（.*?）/g,
      /\(.*?\)/g,
      /正品|官方|旗舰店|专卖店|授权|直营/g,
      /新款|热卖|爆款|特价|促销|包邮/g,
      /\d+\s*(克|g|ml|毫升|升|L|斤|kg|千克)/gi,
      /\s+/g
    ];

    let keyword = title;
    removePatterns.forEach(pattern => {
      keyword = keyword.replace(pattern, ' ');
    });

    // 取前30个字符
    return keyword.trim().substring(0, 30);
  }

  /**
   * 搜索单个平台
   */
  async searchPlatform(platformKey, platform, keyword, originalProduct) {
    try {
      // 这里使用模拟数据，实际应用中需要调用后端API或使用爬虫
      const mockPrice = this.generateMockPrice(originalProduct.price);

      return {
        platform: platform.name,
        platformKey,
        price: mockPrice,
        url: `${platform.searchUrl}${encodeURIComponent(keyword)}`,
        title: originalProduct.title,
        image: originalProduct.image,
        color: platform.color
      };
    } catch (error) {
      console.error(`搜索${platform.name}失败:`, error);
      return null;
    }
  }

  /**
   * 生成模拟价格（开发测试用）
   */
  generateMockPrice(basePrice) {
    const variation = (Math.random() - 0.5) * 0.3; // ±15%波动
    const price = basePrice * (1 + variation);
    return Math.round(price * 100) / 100;
  }

  /**
   * 获取当前价格
   */
  async getCurrentPrice(product) {
    try {
      // 实际应该请求商品页面获取最新价格
      // 这里返回模拟数据
      const variation = (Math.random() - 0.5) * 0.1;
      return Math.round(product.currentPrice * (1 + variation) * 100) / 100;
    } catch (error) {
      console.error('获取当前价格失败:', error);
      return product.currentPrice;
    }
  }

  /**
   * 获取可用优惠券
   */
  async getCoupons(product) {
    // 模拟优惠券数据
    const coupons = [
      {
        id: 'c1',
        value: 10,
        title: '满100减10',
        condition: '满100元可用',
        code: 'SAVE10',
        platform: product.platform,
        expireDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'c2',
        value: 20,
        title: '满200减20',
        condition: '满200元可用',
        code: 'SAVE20',
        platform: product.platform,
        expireDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'c3',
        value: 50,
        title: '新人专享券',
        condition: '新用户首单可用',
        code: 'NEWUSER50',
        platform: product.platform,
        expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 根据商品价格筛选可用券
    return coupons.filter(c => product.price >= c.value * 10);
  }

  /**
   * 获取相似商品
   */
  async getSimilarProducts(product) {
    // 模拟相似商品数据
    const keyword = this.extractSearchKeyword(product.title);

    return [
      {
        id: 'similar_1',
        title: `${keyword} 升级版`,
        price: Math.round(product.price * 1.1 * 100) / 100,
        image: product.image,
        platform: '天猫',
        url: `https://list.tmall.com/search_product.htm?q=${encodeURIComponent(keyword)}`
      },
      {
        id: 'similar_2',
        title: `${keyword} 经典款`,
        price: Math.round(product.price * 0.85 * 100) / 100,
        image: product.image,
        platform: '京东',
        url: `https://search.jd.com/Search?keyword=${encodeURIComponent(keyword)}`
      },
      {
        id: 'similar_3',
        title: `${keyword} 特惠装`,
        price: Math.round(product.price * 0.75 * 100) / 100,
        image: product.image,
        platform: '拼多多',
        url: `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(keyword)}`
      }
    ];
  }

  /**
   * 生成缓存键
   */
  getCacheKey(product) {
    return `${product.platformKey}_${product.id}`;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}
