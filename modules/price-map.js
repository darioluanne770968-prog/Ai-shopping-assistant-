/**
 * AI购物助手 - 全国价格地图模块
 * 展示同一商品在不同地区的价格差异
 */

export class NationalPriceMap {
  constructor() {
    // 中国省份数据
    this.provinces = {
      '北京': { code: 'BJ', region: 'north', tier: 1, population: 21.54 },
      '上海': { code: 'SH', region: 'east', tier: 1, population: 24.87 },
      '广州': { code: 'GZ', region: 'south', tier: 1, population: 18.67 },
      '深圳': { code: 'SZ', region: 'south', tier: 1, population: 17.56 },
      '杭州': { code: 'HZ', region: 'east', tier: 2, population: 12.20 },
      '成都': { code: 'CD', region: 'west', tier: 2, population: 21.00 },
      '武汉': { code: 'WH', region: 'central', tier: 2, population: 12.33 },
      '南京': { code: 'NJ', region: 'east', tier: 2, population: 9.31 },
      '重庆': { code: 'CQ', region: 'west', tier: 2, population: 32.05 },
      '西安': { code: 'XA', region: 'west', tier: 2, population: 13.00 },
      '天津': { code: 'TJ', region: 'north', tier: 2, population: 13.87 },
      '苏州': { code: 'SU', region: 'east', tier: 2, population: 12.75 },
      '郑州': { code: 'ZZ', region: 'central', tier: 2, population: 12.60 },
      '长沙': { code: 'CS', region: 'central', tier: 2, population: 10.47 },
      '沈阳': { code: 'SY', region: 'northeast', tier: 2, population: 9.07 },
      '青岛': { code: 'QD', region: 'north', tier: 2, population: 10.07 },
      '宁波': { code: 'NB', region: 'east', tier: 2, population: 9.54 },
      '东莞': { code: 'DG', region: 'south', tier: 2, population: 10.47 },
      '无锡': { code: 'WX', region: 'east', tier: 2, population: 7.46 },
      '厦门': { code: 'XM', region: 'south', tier: 2, population: 5.28 },
      '合肥': { code: 'HF', region: 'east', tier: 2, population: 9.37 },
      '昆明': { code: 'KM', region: 'west', tier: 2, population: 8.46 },
      '哈尔滨': { code: 'HRB', region: 'northeast', tier: 2, population: 9.55 },
      '济南': { code: 'JN', region: 'north', tier: 2, population: 9.20 },
      '福州': { code: 'FZ', region: 'south', tier: 2, population: 8.29 }
    };

    // 区域物流系数
    this.logisticsFactors = {
      east: 1.0,      // 东部发达地区
      south: 1.02,    // 南部
      north: 1.05,    // 北部
      central: 1.08,  // 中部
      west: 1.12,     // 西部
      northeast: 1.15 // 东北
    };

    // 城市消费水平系数
    this.consumptionFactors = {
      1: 1.15,  // 一线城市
      2: 1.05,  // 二线城市
      3: 0.95,  // 三线城市
      4: 0.90   // 四线及以下
    };

    // 商品类别的地区差异系数
    this.categoryRegionalFactors = {
      electronics: { variation: 0.03, distribution: 'uniform' },
      cosmetics: { variation: 0.08, distribution: 'tiered' },
      clothing: { variation: 0.15, distribution: 'regional' },
      food: { variation: 0.20, distribution: 'regional' },
      furniture: { variation: 0.25, distribution: 'distance' },
      baby: { variation: 0.05, distribution: 'uniform' }
    };
  }

  /**
   * 生成全国价格分布
   */
  async generatePriceMap(product) {
    const category = this.detectCategory(product);
    const basePrice = product.price;
    const priceData = {};

    for (const [city, info] of Object.entries(this.provinces)) {
      const price = this.calculateRegionalPrice(basePrice, info, category);
      priceData[city] = {
        ...info,
        city,
        price: Math.round(price * 100) / 100,
        difference: Math.round((price - basePrice) * 100) / 100,
        percentDiff: (((price - basePrice) / basePrice) * 100).toFixed(1) + '%',
        shippingCost: this.estimateShipping(info.region),
        totalCost: Math.round((price + this.estimateShipping(info.region)) * 100) / 100
      };
    }

    // 找出最低价和最高价城市
    const sorted = Object.values(priceData).sort((a, b) => a.totalCost - b.totalCost);

    return {
      product: product.title,
      category,
      basePrice,
      priceMap: priceData,
      cheapest: sorted[0],
      mostExpensive: sorted[sorted.length - 1],
      priceDifference: {
        amount: Math.round(sorted[sorted.length - 1].totalCost - sorted[0].totalCost),
        percent: (((sorted[sorted.length - 1].totalCost - sorted[0].totalCost) / basePrice) * 100).toFixed(1) + '%'
      },
      recommendation: this.generateRecommendation(sorted, product)
    };
  }

  /**
   * 计算区域价格
   */
  calculateRegionalPrice(basePrice, cityInfo, category) {
    let price = basePrice;

    // 应用物流系数
    const logisticsFactor = this.logisticsFactors[cityInfo.region] || 1;
    price *= logisticsFactor;

    // 应用城市等级消费系数
    const consumptionFactor = this.consumptionFactors[cityInfo.tier] || 1;
    price *= consumptionFactor;

    // 应用类别差异
    const categoryFactor = this.categoryRegionalFactors[category];
    if (categoryFactor) {
      // 添加随机波动模拟真实市场差异
      const variation = (Math.random() - 0.5) * 2 * categoryFactor.variation;
      price *= (1 + variation);
    }

    return price;
  }

  /**
   * 估算运费
   */
  estimateShipping(region) {
    const shippingCosts = {
      east: 8,
      south: 10,
      north: 12,
      central: 15,
      west: 18,
      northeast: 20
    };
    return shippingCosts[region] || 15;
  }

  /**
   * 检测商品类别
   */
  detectCategory(product) {
    const title = (product.title || '').toLowerCase();

    const categories = {
      electronics: ['手机', '电脑', '数码', '电子', 'iphone', 'ipad'],
      cosmetics: ['化妆品', '护肤', '美妆', '面膜', '精华'],
      clothing: ['衣服', '服装', '鞋', '包', '服饰'],
      food: ['食品', '零食', '特产', '水果', '生鲜'],
      furniture: ['家具', '沙发', '桌子', '床', '柜子'],
      baby: ['婴儿', '宝宝', '母婴', '奶粉', '纸尿裤']
    };

    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => title.includes(kw))) {
        return cat;
      }
    }
    return 'general';
  }

  /**
   * 生成购买建议
   */
  generateRecommendation(sortedPrices, product) {
    const cheapest = sortedPrices[0];
    const currentLocation = this.getCurrentLocation();

    // 如果当前城市已是最便宜的
    if (cheapest.city === currentLocation) {
      return {
        type: 'local',
        message: '当前地区价格已是最优！',
        savings: 0
      };
    }

    const currentCityData = sortedPrices.find(p => p.city === currentLocation);
    const savings = currentCityData
      ? currentCityData.totalCost - cheapest.totalCost
      : sortedPrices[Math.floor(sortedPrices.length / 2)].totalCost - cheapest.totalCost;

    if (savings > 50) {
      return {
        type: 'switch',
        message: `在${cheapest.city}购买可省¥${Math.round(savings)}`,
        suggestedCity: cheapest.city,
        savings: Math.round(savings)
      };
    }

    return {
      type: 'marginal',
      message: '各地价差不大，就近购买即可',
      savings: Math.round(savings)
    };
  }

  /**
   * 获取当前位置（模拟）
   */
  getCurrentLocation() {
    // 实际应使用地理位置API
    return '上海';
  }

  /**
   * 获取区域最低价汇总
   */
  getRegionalLowestPrices(priceMap) {
    const regions = {};

    for (const cityData of Object.values(priceMap)) {
      const region = cityData.region;
      if (!regions[region] || cityData.totalCost < regions[region].totalCost) {
        regions[region] = cityData;
      }
    }

    return Object.entries(regions).map(([region, data]) => ({
      region: this.getRegionName(region),
      city: data.city,
      price: data.price,
      totalCost: data.totalCost
    }));
  }

  /**
   * 获取区域名称
   */
  getRegionName(region) {
    const names = {
      east: '华东',
      south: '华南',
      north: '华北',
      central: '华中',
      west: '西部',
      northeast: '东北'
    };
    return names[region] || region;
  }

  /**
   * 生成价格热力图数据
   */
  generateHeatmapData(priceMap) {
    const data = [];

    for (const [city, info] of Object.entries(priceMap)) {
      // 模拟城市坐标（实际需要真实坐标）
      const coords = this.getCityCoordinates(city);
      if (coords) {
        data.push({
          city,
          lat: coords.lat,
          lng: coords.lng,
          price: info.price,
          intensity: this.normalizePrice(info.price, priceMap)
        });
      }
    }

    return data;
  }

  /**
   * 获取城市坐标（模拟）
   */
  getCityCoordinates(city) {
    const coords = {
      '北京': { lat: 39.9042, lng: 116.4074 },
      '上海': { lat: 31.2304, lng: 121.4737 },
      '广州': { lat: 23.1291, lng: 113.2644 },
      '深圳': { lat: 22.5431, lng: 114.0579 },
      '杭州': { lat: 30.2741, lng: 120.1551 },
      '成都': { lat: 30.5728, lng: 104.0668 },
      '武汉': { lat: 30.5928, lng: 114.3055 },
      '南京': { lat: 32.0603, lng: 118.7969 },
      '重庆': { lat: 29.4316, lng: 106.9123 },
      '西安': { lat: 34.3416, lng: 108.9398 }
    };
    return coords[city];
  }

  /**
   * 归一化价格（0-1）
   */
  normalizePrice(price, priceMap) {
    const prices = Object.values(priceMap).map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (max === min) return 0.5;
    return (price - min) / (max - min);
  }

  /**
   * 跟踪区域价格变化
   */
  async trackPriceChanges(productId) {
    return new Promise(resolve => {
      chrome.storage.local.get(['priceMapHistory'], result => {
        const history = result.priceMapHistory || {};
        const productHistory = history[productId] || [];

        // 计算价格变化趋势
        if (productHistory.length >= 2) {
          const latest = productHistory[productHistory.length - 1];
          const previous = productHistory[productHistory.length - 2];

          const changes = {};
          for (const city of Object.keys(latest.priceMap)) {
            if (previous.priceMap[city]) {
              changes[city] = {
                current: latest.priceMap[city].price,
                previous: previous.priceMap[city].price,
                change: latest.priceMap[city].price - previous.priceMap[city].price
              };
            }
          }

          resolve({
            productId,
            dataPoints: productHistory.length,
            changes,
            trend: this.analyzePriceTrend(productHistory)
          });
        } else {
          resolve({
            productId,
            dataPoints: productHistory.length,
            message: '数据不足，需要更多历史记录'
          });
        }
      });
    });
  }

  /**
   * 分析价格趋势
   */
  analyzePriceTrend(history) {
    if (history.length < 3) return 'insufficient_data';

    const avgPrices = history.map(h => {
      const prices = Object.values(h.priceMap).map(p => p.price);
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    });

    const recentTrend = avgPrices.slice(-3);
    const isIncreasing = recentTrend[2] > recentTrend[1] && recentTrend[1] > recentTrend[0];
    const isDecreasing = recentTrend[2] < recentTrend[1] && recentTrend[1] < recentTrend[0];

    if (isIncreasing) return 'rising';
    if (isDecreasing) return 'falling';
    return 'stable';
  }

  /**
   * 比较多商品区域价格
   */
  async compareMultipleProducts(products) {
    const results = [];

    for (const product of products) {
      const priceMap = await this.generatePriceMap(product);
      results.push({
        product: product.title,
        cheapestCity: priceMap.cheapest.city,
        cheapestPrice: priceMap.cheapest.totalCost,
        savings: priceMap.priceDifference.amount
      });
    }

    // 找出最佳购买组合
    const cityScores = {};
    for (const result of results) {
      const city = result.cheapestCity;
      if (!cityScores[city]) {
        cityScores[city] = { count: 0, totalSavings: 0 };
      }
      cityScores[city].count++;
      cityScores[city].totalSavings += result.savings;
    }

    const bestCity = Object.entries(cityScores)
      .sort((a, b) => b[1].totalSavings - a[1].totalSavings)[0];

    return {
      products: results,
      recommendation: {
        city: bestCity[0],
        productCount: bestCity[1].count,
        totalSavings: Math.round(bestCity[1].totalSavings)
      }
    };
  }
}
