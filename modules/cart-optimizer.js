/**
 * AI购物助手 - 跨店凑单优化模块
 * 计算多件商品的最优购买方案
 */

export class CartOptimizer {
  constructor() {
    this.platforms = ['淘宝', '天猫', '京东', '拼多多', '苏宁'];
  }

  /**
   * 优化购物车
   * @param {Array} items - 购物车商品列表
   * @returns {Object} - 优化方案
   */
  async optimize(items) {
    if (!items || items.length === 0) {
      return { success: false, message: '购物车为空' };
    }

    // 获取每个商品在各平台的价格
    const priceMatrix = await this.getPriceMatrix(items);

    // 获取各平台的优惠规则
    const platformRules = await this.getPlatformRules();

    // 计算所有可能的购买方案
    const allSchemes = this.generateSchemes(items, priceMatrix, platformRules);

    // 找出最优方案
    const bestScheme = this.findBestScheme(allSchemes);

    // 计算节省金额
    const originalTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const savings = originalTotal - bestScheme.totalPrice;

    return {
      success: true,
      originalTotal,
      optimizedTotal: bestScheme.totalPrice,
      savings,
      savingsPercent: ((savings / originalTotal) * 100).toFixed(1),
      bestScheme,
      allSchemes: allSchemes.slice(0, 5), // 返回前5个方案
      tips: this.generateTips(bestScheme, platformRules)
    };
  }

  /**
   * 获取价格矩阵
   */
  async getPriceMatrix(items) {
    const matrix = {};

    for (const item of items) {
      matrix[item.id] = {};

      for (const platform of this.platforms) {
        // 模拟各平台价格
        const basePrice = item.price;
        const variation = (Math.random() - 0.3) * 0.2; // -10% ~ +10%
        matrix[item.id][platform] = {
          price: Math.round(basePrice * (1 + variation) * 100) / 100,
          available: Math.random() > 0.1, // 90%概率有货
          shipping: platform === '京东' ? 0 : (basePrice > 99 ? 0 : 10),
          deliveryDays: platform === '京东' ? 1 : Math.floor(Math.random() * 3) + 2
        };
      }
    }

    return matrix;
  }

  /**
   * 获取平台优惠规则
   */
  async getPlatformRules() {
    return {
      '淘宝': {
        coupons: [
          { threshold: 99, discount: 5, name: '满99减5' },
          { threshold: 199, discount: 15, name: '满199减15' },
          { threshold: 299, discount: 30, name: '满299减30' }
        ],
        freeShipping: 99
      },
      '天猫': {
        coupons: [
          { threshold: 100, discount: 10, name: '满100减10' },
          { threshold: 200, discount: 25, name: '满200减25' },
          { threshold: 400, discount: 50, name: '满400减50' }
        ],
        freeShipping: 88
      },
      '京东': {
        coupons: [
          { threshold: 99, discount: 10, name: '满99减10' },
          { threshold: 199, discount: 25, name: '满199减25' },
          { threshold: 299, discount: 50, name: '满299减50' }
        ],
        freeShipping: 0, // 京东Plus免运费
        plusDiscount: 0.95 // Plus会员95折
      },
      '拼多多': {
        coupons: [
          { threshold: 50, discount: 3, name: '满50减3' },
          { threshold: 100, discount: 8, name: '满100减8' }
        ],
        freeShipping: 29
      },
      '苏宁': {
        coupons: [
          { threshold: 100, discount: 10, name: '满100减10' },
          { threshold: 300, discount: 40, name: '满300减40' }
        ],
        freeShipping: 99
      }
    };
  }

  /**
   * 生成所有购买方案
   */
  generateSchemes(items, priceMatrix, platformRules) {
    const schemes = [];

    // 方案1：全部在单一平台购买
    for (const platform of this.platforms) {
      const scheme = this.calculateSinglePlatformScheme(items, priceMatrix, platformRules, platform);
      if (scheme) schemes.push(scheme);
    }

    // 方案2：智能分配（每件商品选最低价平台）
    const smartScheme = this.calculateSmartScheme(items, priceMatrix, platformRules);
    schemes.push(smartScheme);

    // 方案3：凑单优化（考虑满减）
    const bundleSchemes = this.calculateBundleSchemes(items, priceMatrix, platformRules);
    schemes.push(...bundleSchemes);

    // 按总价排序
    schemes.sort((a, b) => a.totalPrice - b.totalPrice);

    return schemes;
  }

  /**
   * 计算单平台方案
   */
  calculateSinglePlatformScheme(items, priceMatrix, platformRules, platform) {
    const rules = platformRules[platform];
    let subtotal = 0;
    let shipping = 0;
    const itemDetails = [];

    for (const item of items) {
      const platformPrice = priceMatrix[item.id][platform];
      if (!platformPrice.available) return null;

      const itemTotal = platformPrice.price * item.quantity;
      subtotal += itemTotal;

      itemDetails.push({
        ...item,
        platform,
        unitPrice: platformPrice.price,
        total: itemTotal
      });
    }

    // 计算运费
    if (subtotal < rules.freeShipping) {
      shipping = 10;
    }

    // 计算满减优惠
    let discount = 0;
    let usedCoupon = null;
    for (const coupon of rules.coupons.sort((a, b) => b.threshold - a.threshold)) {
      if (subtotal >= coupon.threshold) {
        discount = coupon.discount;
        usedCoupon = coupon.name;
        break;
      }
    }

    return {
      type: 'single_platform',
      name: `全部在${platform}购买`,
      platform,
      items: itemDetails,
      subtotal,
      shipping,
      discount,
      usedCoupon,
      totalPrice: subtotal + shipping - discount
    };
  }

  /**
   * 计算智能分配方案
   */
  calculateSmartScheme(items, priceMatrix, platformRules) {
    const itemDetails = [];
    const platformTotals = {};

    for (const item of items) {
      // 找最低价平台
      let minPrice = Infinity;
      let bestPlatform = null;

      for (const platform of this.platforms) {
        const platformPrice = priceMatrix[item.id][platform];
        if (platformPrice.available && platformPrice.price < minPrice) {
          minPrice = platformPrice.price;
          bestPlatform = platform;
        }
      }

      const itemTotal = minPrice * item.quantity;

      itemDetails.push({
        ...item,
        platform: bestPlatform,
        unitPrice: minPrice,
        total: itemTotal
      });

      platformTotals[bestPlatform] = (platformTotals[bestPlatform] || 0) + itemTotal;
    }

    // 计算各平台运费和优惠
    let totalShipping = 0;
    let totalDiscount = 0;
    const usedCoupons = [];

    for (const [platform, subtotal] of Object.entries(platformTotals)) {
      const rules = platformRules[platform];

      // 运费
      if (subtotal < rules.freeShipping) {
        totalShipping += 10;
      }

      // 满减
      for (const coupon of rules.coupons.sort((a, b) => b.threshold - a.threshold)) {
        if (subtotal >= coupon.threshold) {
          totalDiscount += coupon.discount;
          usedCoupons.push(`${platform}: ${coupon.name}`);
          break;
        }
      }
    }

    const subtotal = itemDetails.reduce((sum, item) => sum + item.total, 0);

    return {
      type: 'smart',
      name: '智能分配（每件选最低价）',
      items: itemDetails,
      platformTotals,
      subtotal,
      shipping: totalShipping,
      discount: totalDiscount,
      usedCoupons,
      totalPrice: subtotal + totalShipping - totalDiscount
    };
  }

  /**
   * 计算凑单方案
   */
  calculateBundleSchemes(items, priceMatrix, platformRules) {
    const schemes = [];

    // 尝试将商品凑到满减门槛
    for (const platform of this.platforms) {
      const rules = platformRules[platform];

      for (const coupon of rules.coupons) {
        const scheme = this.tryBundleForCoupon(items, priceMatrix, platform, coupon, rules);
        if (scheme) schemes.push(scheme);
      }
    }

    return schemes;
  }

  /**
   * 尝试凑满减
   */
  tryBundleForCoupon(items, priceMatrix, platform, coupon, rules) {
    const selectedItems = [];
    let subtotal = 0;

    // 贪心选择商品直到达到满减门槛
    const sortedItems = items
      .filter(item => priceMatrix[item.id][platform].available)
      .sort((a, b) => priceMatrix[b.id][platform].price - priceMatrix[a.id][platform].price);

    for (const item of sortedItems) {
      const price = priceMatrix[item.id][platform].price * item.quantity;
      selectedItems.push({
        ...item,
        platform,
        unitPrice: priceMatrix[item.id][platform].price,
        total: price
      });
      subtotal += price;

      if (subtotal >= coupon.threshold) break;
    }

    if (subtotal < coupon.threshold || selectedItems.length !== items.length) {
      return null;
    }

    const shipping = subtotal >= rules.freeShipping ? 0 : 10;

    return {
      type: 'bundle',
      name: `${platform}凑单${coupon.name}`,
      platform,
      items: selectedItems,
      subtotal,
      shipping,
      discount: coupon.discount,
      usedCoupon: coupon.name,
      totalPrice: subtotal + shipping - coupon.discount
    };
  }

  /**
   * 找出最优方案
   */
  findBestScheme(schemes) {
    return schemes.reduce((best, current) =>
      current.totalPrice < best.totalPrice ? current : best
    );
  }

  /**
   * 生成优化建议
   */
  generateTips(bestScheme, platformRules) {
    const tips = [];

    if (bestScheme.type === 'smart') {
      tips.push('💡 商品分布在多个平台，注意分别下单');
    }

    if (bestScheme.shipping > 0) {
      tips.push(`💡 还差一点就包邮了，可以考虑凑单`);
    }

    if (bestScheme.usedCoupon) {
      tips.push(`🎫 已应用优惠券: ${Array.isArray(bestScheme.usedCoupons) ? bestScheme.usedCoupons.join(', ') : bestScheme.usedCoupon}`);
    }

    // 检查是否有更高门槛的满减可以凑
    if (bestScheme.platform) {
      const rules = platformRules[bestScheme.platform];
      const nextCoupon = rules.coupons.find(c => c.threshold > bestScheme.subtotal);
      if (nextCoupon) {
        const diff = nextCoupon.threshold - bestScheme.subtotal;
        if (diff < 50 && nextCoupon.discount - (bestScheme.discount || 0) > diff) {
          tips.push(`💡 再买¥${diff.toFixed(0)}可享${nextCoupon.name}，更划算！`);
        }
      }
    }

    return tips;
  }

  /**
   * 添加商品到优化队列
   */
  addItem(item) {
    if (!this.pendingItems) {
      this.pendingItems = [];
    }
    this.pendingItems.push(item);
  }

  /**
   * 获取待优化商品
   */
  getPendingItems() {
    return this.pendingItems || [];
  }

  /**
   * 清空待优化商品
   */
  clearPendingItems() {
    this.pendingItems = [];
  }
}
