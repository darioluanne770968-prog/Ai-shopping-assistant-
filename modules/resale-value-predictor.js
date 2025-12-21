/**
 * AI购物助手 - 二手残值预测模块
 * 预测商品转手价值，计算真实拥有成本
 */

export class ResaleValuePredictor {
  constructor() {
    // 商品贬值曲线参数（按类别）
    this.depreciationCurves = {
      electronics: {
        name: '电子产品',
        initialDrop: 0.15,    // 开箱即贬值15%
        yearlyRate: 0.25,     // 每年贬值25%
        floorValue: 0.10,     // 最低残值10%
        peakResaleMonth: 10,  // 最佳转手时机（月）
        factors: {
          brand: { apple: 0.9, samsung: 0.7, xiaomi: 0.6, huawei: 0.7 },
          condition: { mint: 1, excellent: 0.92, good: 0.8, fair: 0.65 }
        }
      },
      luxury: {
        name: '奢侈品',
        initialDrop: 0.10,
        yearlyRate: 0.08,
        floorValue: 0.40,
        peakResaleMonth: 36,
        factors: {
          brand: { hermes: 1.2, chanel: 1.1, lv: 0.95, gucci: 0.85 },
          condition: { mint: 1, excellent: 0.95, good: 0.85, fair: 0.70 },
          limited: { yes: 1.3, no: 1 }
        }
      },
      appliances: {
        name: '家电',
        initialDrop: 0.20,
        yearlyRate: 0.15,
        floorValue: 0.15,
        peakResaleMonth: 18,
        factors: {
          brand: { dyson: 0.85, philips: 0.7, midea: 0.5 },
          condition: { mint: 1, excellent: 0.9, good: 0.75, fair: 0.55 }
        }
      },
      clothing: {
        name: '服饰',
        initialDrop: 0.40,
        yearlyRate: 0.30,
        floorValue: 0.05,
        peakResaleMonth: 3,
        factors: {
          brand: { supreme: 1.2, nike: 0.6, uniqlo: 0.3, zara: 0.2 },
          condition: { new_with_tag: 1, worn_once: 0.7, good: 0.4 },
          limited: { yes: 1.5, no: 1 }
        }
      },
      furniture: {
        name: '家具',
        initialDrop: 0.35,
        yearlyRate: 0.12,
        floorValue: 0.15,
        peakResaleMonth: 24,
        factors: {
          brand: { ikea: 0.5, muji: 0.6, herman_miller: 0.85 },
          material: { solid_wood: 1, particle_board: 0.5, metal: 0.7 }
        }
      },
      toys: {
        name: '玩具/模型',
        initialDrop: 0.30,
        yearlyRate: 0.15,
        floorValue: 0.20,
        peakResaleMonth: 60,
        factors: {
          brand: { lego: 1.1, bandai: 0.9, hasbro: 0.7 },
          unopened: { yes: 1.3, no: 1 },
          limited: { yes: 1.8, no: 1 }
        }
      },
      books: {
        name: '图书',
        initialDrop: 0.50,
        yearlyRate: 0.10,
        floorValue: 0.10,
        peakResaleMonth: 1,
        factors: {
          condition: { new: 1, like_new: 0.7, good: 0.4, acceptable: 0.2 },
          textbook: { yes: 0.8, no: 1 }
        }
      },
      collectibles: {
        name: '收藏品',
        initialDrop: 0.05,
        yearlyRate: -0.05, // 可能升值
        floorValue: 0.80,
        peakResaleMonth: 120,
        factors: {
          rarity: { unique: 2, limited: 1.5, rare: 1.2, common: 0.9 },
          authentication: { certified: 1.2, uncertified: 0.8 }
        }
      }
    };

    // 二手交易平台佣金
    this.platforms = {
      xianyu: { name: '闲鱼', commission: 0, tips: '免佣金，但需自行协商' },
      zhuanzhuan: { name: '转转', commission: 0.05, tips: '平台担保，5%服务费' },
      aihuishou: { name: '爱回收', commission: 0.10, tips: '电子产品专业，报价偏低10%' },
      paipai: { name: '拍拍', commission: 0.06, tips: '京东旗下，6%服务费' },
      dewu: { name: '得物', commission: 0.095, tips: '潮品专区，9.5%服务费' },
      douyin: { name: '抖音二手', commission: 0.02, tips: '2%技术服务费' }
    };
  }

  /**
   * 预测残值
   */
  predictResaleValue(product, options = {}) {
    const category = this.detectCategory(product);
    const curve = this.depreciationCurves[category];

    if (!curve) {
      return { error: '无法识别商品类别' };
    }

    const originalPrice = product.price;
    const monthsOwned = options.monthsOwned || 12;
    const condition = options.condition || 'good';
    const brand = this.detectBrand(product.title);

    // 基础残值计算
    let value = originalPrice;

    // 1. 开箱贬值
    value *= (1 - curve.initialDrop);

    // 2. 时间贬值（复合贬值）
    const years = monthsOwned / 12;
    value *= Math.pow(1 - curve.yearlyRate, years);

    // 3. 确保不低于底价
    value = Math.max(value, originalPrice * curve.floorValue);

    // 4. 应用品牌系数
    if (curve.factors.brand && brand) {
      const brandFactor = curve.factors.brand[brand.toLowerCase()] || 1;
      value *= brandFactor;
    }

    // 5. 应用成色系数
    if (curve.factors.condition) {
      const conditionFactor = curve.factors.condition[condition] || 0.8;
      value *= conditionFactor;
    }

    // 6. 限量版加成
    if (options.limited && curve.factors.limited) {
      value *= curve.factors.limited.yes;
    }

    // 计算真实拥有成本
    const ownershipCost = originalPrice - value;
    const monthlyDepreciation = ownershipCost / monthsOwned;

    // 预测不同时间点的残值
    const timeline = this.generateTimeline(originalPrice, curve, {
      brand,
      condition,
      limited: options.limited
    });

    return {
      category,
      categoryName: curve.name,
      originalPrice,
      currentValue: Math.round(value),
      depreciationRate: ((1 - value / originalPrice) * 100).toFixed(1) + '%',
      ownershipCost: Math.round(ownershipCost),
      monthlyDepreciation: Math.round(monthlyDepreciation),
      dailyCost: (monthlyDepreciation / 30).toFixed(2),
      timeline,
      bestSellMonth: curve.peakResaleMonth,
      bestSellValue: timeline.find(t => t.month === curve.peakResaleMonth)?.value,
      factors: {
        brand,
        condition,
        limited: options.limited || false
      }
    };
  }

  /**
   * 生成残值时间线
   */
  generateTimeline(originalPrice, curve, factors) {
    const timeline = [];
    const checkpoints = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60];

    for (const month of checkpoints) {
      let value = originalPrice;

      // 开箱贬值
      if (month > 0) {
        value *= (1 - curve.initialDrop);
      }

      // 时间贬值
      const years = month / 12;
      value *= Math.pow(1 - curve.yearlyRate, years);

      // 底价
      value = Math.max(value, originalPrice * curve.floorValue);

      // 因素调整
      if (curve.factors.brand && factors.brand) {
        value *= curve.factors.brand[factors.brand.toLowerCase()] || 1;
      }

      timeline.push({
        month,
        value: Math.round(value),
        percentage: Math.round(value / originalPrice * 100)
      });
    }

    return timeline;
  }

  /**
   * 比较购买 vs 租赁
   */
  compareBuyVsRent(product, usagePeriod) {
    const resale = this.predictResaleValue(product, { monthsOwned: usagePeriod });

    // 估算租赁成本（按月）
    const monthlyRentRate = 0.03 + (product.price < 1000 ? 0.02 : 0);
    const totalRent = product.price * monthlyRentRate * usagePeriod;

    const buyNetCost = resale.ownershipCost;
    const rentCost = totalRent;

    const recommendation = buyNetCost < rentCost ? 'buy' : 'rent';
    const savings = Math.abs(buyNetCost - rentCost);

    return {
      product: product.title,
      usagePeriod: `${usagePeriod}个月`,
      buyAnalysis: {
        originalPrice: product.price,
        resaleValue: resale.currentValue,
        netCost: buyNetCost,
        monthlyEquivalent: Math.round(buyNetCost / usagePeriod)
      },
      rentAnalysis: {
        monthlyRate: (monthlyRentRate * 100).toFixed(1) + '%',
        monthlyRent: Math.round(product.price * monthlyRentRate),
        totalCost: Math.round(rentCost)
      },
      recommendation,
      savings: Math.round(savings),
      advice: recommendation === 'buy'
        ? `建议购买，使用${usagePeriod}个月后转手可省¥${Math.round(savings)}`
        : `建议租赁，${usagePeriod}个月内租赁更划算，省¥${Math.round(savings)}`
    };
  }

  /**
   * 计算真实单次使用成本
   */
  calculateCostPerUse(product, estimatedUses, resaleMonths = 12) {
    const resale = this.predictResaleValue(product, { monthsOwned: resaleMonths });

    const totalCost = resale.ownershipCost;
    const costPerUse = totalCost / estimatedUses;

    // 对比同类商品租赁
    const rentalCostPerUse = product.price * 0.05; // 假设单次租赁5%

    return {
      product: product.title,
      originalPrice: product.price,
      estimatedUses,
      resaleValue: resale.currentValue,
      totalOwnershipCost: Math.round(totalCost),
      costPerUse: costPerUse.toFixed(2),
      rentalCostPerUse: rentalCostPerUse.toFixed(2),
      breakEvenUses: Math.ceil(totalCost / rentalCostPerUse),
      worthBuying: estimatedUses > Math.ceil(totalCost / rentalCostPerUse),
      advice: estimatedUses > Math.ceil(totalCost / rentalCostPerUse)
        ? `预计使用${estimatedUses}次，每次成本¥${costPerUse.toFixed(2)}，购买划算`
        : `预计使用少于${Math.ceil(totalCost / rentalCostPerUse)}次，建议租赁`
    };
  }

  /**
   * 最佳转手时机分析
   */
  findBestResaleTime(product, maxHoldMonths = 36) {
    const category = this.detectCategory(product);
    const curve = this.depreciationCurves[category];

    if (!curve) {
      return { error: '无法识别商品类别' };
    }

    const analysis = [];
    let bestMonth = 0;
    let bestScore = 0;

    for (let month = 1; month <= maxHoldMonths; month++) {
      const resale = this.predictResaleValue(product, { monthsOwned: month });

      // 价值保留率
      const retentionRate = resale.currentValue / product.price;

      // 贬值速度（斜率）
      const prevResale = this.predictResaleValue(product, { monthsOwned: month - 1 });
      const depreciationSpeed = (prevResale.currentValue - resale.currentValue) / prevResale.currentValue;

      // 综合评分（越高越适合转手）
      const score = retentionRate * 0.6 + (1 - depreciationSpeed) * 0.4;

      analysis.push({
        month,
        value: resale.currentValue,
        retentionRate: (retentionRate * 100).toFixed(1) + '%',
        depreciationSpeed: (depreciationSpeed * 100).toFixed(2) + '%/月',
        score: score.toFixed(3)
      });

      // 找贬值速度突然加快的拐点之前
      if (month > 3 && depreciationSpeed > 0.02 && score > bestScore) {
        bestMonth = month - 1;
        bestScore = score;
      }
    }

    // 如果没找到拐点，使用曲线推荐
    if (bestMonth === 0) {
      bestMonth = curve.peakResaleMonth;
    }

    const bestResale = this.predictResaleValue(product, { monthsOwned: bestMonth });

    return {
      product: product.title,
      category: curve.name,
      recommendedSellMonth: bestMonth,
      valueAtRecommendedTime: bestResale.currentValue,
      retentionAtRecommendedTime: (bestResale.currentValue / product.price * 100).toFixed(1) + '%',
      timeline: analysis.filter(a => [1, 3, 6, 12, 18, 24, 36].includes(a.month)),
      advice: `建议在购买后${bestMonth}个月内转手，此时残值约¥${bestResale.currentValue}（${(bestResale.currentValue / product.price * 100).toFixed(0)}%）`
    };
  }

  /**
   * 检测商品类别
   */
  detectCategory(product) {
    const title = (product.title || '').toLowerCase();
    const category = (product.category || '').toLowerCase();

    const categoryKeywords = {
      electronics: ['手机', 'iphone', '电脑', 'laptop', '平板', 'ipad', '耳机', 'airpods', '相机'],
      luxury: ['lv', 'gucci', 'chanel', '爱马仕', 'hermes', '奢侈', '名牌包'],
      appliances: ['家电', '电器', '吸尘器', '洗衣机', '冰箱', '空调', '戴森'],
      clothing: ['衣服', '鞋', '服装', 'nike', 'adidas', 'supreme', '潮牌'],
      furniture: ['家具', '沙发', '桌子', '椅子', 'ikea', '宜家'],
      toys: ['玩具', '乐高', 'lego', '模型', '手办', 'bandai'],
      books: ['书', '图书', '教材', '小说'],
      collectibles: ['收藏', '限量', '纪念', '古董', '艺术品']
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => title.includes(kw) || category.includes(kw))) {
        return cat;
      }
    }

    return 'electronics'; // 默认类别
  }

  /**
   * 检测品牌
   */
  detectBrand(title) {
    const brands = [
      'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OPPO', 'Vivo',
      'Nike', 'Adidas', 'Supreme', 'Uniqlo', 'Zara',
      'LV', 'Louis Vuitton', 'Gucci', 'Chanel', 'Hermes', '爱马仕',
      'Dyson', '戴森', 'Philips', 'Midea', '美的',
      'IKEA', '宜家', 'Muji', '无印良品',
      'LEGO', '乐高', 'Bandai', '万代'
    ];

    const lowerTitle = title.toLowerCase();
    for (const brand of brands) {
      if (lowerTitle.includes(brand.toLowerCase())) {
        return brand;
      }
    }

    return null;
  }

  /**
   * 获取二手平台建议
   */
  getPlatformRecommendation(product, resaleValue) {
    const category = this.detectCategory(product);

    const recommendations = {
      electronics: ['aihuishou', 'zhuanzhuan', 'xianyu'],
      luxury: ['dewu', 'xianyu', 'paipai'],
      clothing: ['dewu', 'xianyu', 'douyin'],
      default: ['xianyu', 'zhuanzhuan', 'douyin']
    };

    const platformIds = recommendations[category] || recommendations.default;

    return platformIds.map(id => {
      const platform = this.platforms[id];
      const commission = resaleValue * platform.commission;
      const netProceeds = resaleValue - commission;

      return {
        id,
        name: platform.name,
        commission: platform.commission * 100 + '%',
        commissionAmount: Math.round(commission),
        netProceeds: Math.round(netProceeds),
        tips: platform.tips
      };
    });
  }

  /**
   * 生成完整的残值报告
   */
  generateResaleReport(product, options = {}) {
    const resale = this.predictResaleValue(product, options);
    const bestTime = this.findBestResaleTime(product);
    const platforms = this.getPlatformRecommendation(product, resale.currentValue);

    return {
      summary: {
        product: product.title,
        originalPrice: product.price,
        currentValue: resale.currentValue,
        ownershipCost: resale.ownershipCost,
        dailyCost: resale.dailyCost
      },
      depreciation: {
        category: resale.categoryName,
        rate: resale.depreciationRate,
        timeline: resale.timeline
      },
      recommendation: {
        bestSellMonth: bestTime.recommendedSellMonth,
        valueAtBestTime: bestTime.valueAtRecommendedTime,
        advice: bestTime.advice
      },
      platforms,
      generatedAt: new Date().toISOString()
    };
  }
}
