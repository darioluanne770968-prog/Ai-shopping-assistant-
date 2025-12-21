/**
 * AI购物助手 - 假货图片检测模块
 * 使用图像分析检测商品图片异常，识别潜在假货风险
 */

export class FakeProductDetector {
  constructor() {
    // 检测指标权重
    this.detectionWeights = {
      imageQuality: 0.15,
      watermarkAnalysis: 0.10,
      priceAnomaly: 0.20,
      sellerReputation: 0.20,
      descriptionAnalysis: 0.15,
      reviewAuthenticity: 0.20
    };

    // 高风险品牌
    this.highRiskBrands = [
      'LV', 'Louis Vuitton', 'Gucci', 'Chanel', 'Hermes', '爱马仕',
      'Rolex', '劳力士', 'Prada', 'Dior', 'Fendi',
      'Nike', 'Adidas', 'Supreme', 'Off-White',
      'Apple', 'Dyson', 'Bose', 'Sony'
    ];

    // 假货信号词
    this.suspiciousKeywords = {
      title: [
        '原单', '尾货', '代工厂', '外贸', '出口转内销',
        '高仿', '1:1', '复刻', 'A货', '超A',
        '工厂直销', '专柜同款', '原版'
      ],
      description: [
        '不支持验货', '不接受专柜验', '介意勿拍',
        '懂的来', '自己看图', '完美主义勿扰'
      ]
    };

    // 正品特征
    this.authenticityIndicators = {
      hasOfficialCertificate: { score: 20, description: '有官方认证' },
      hasReceiptPhoto: { score: 15, description: '有购买凭证' },
      hasSerialNumber: { score: 15, description: '有序列号/防伪码' },
      hasPackagingPhotos: { score: 10, description: '有完整包装照片' },
      hasMultiAnglePhotos: { score: 10, description: '有多角度实拍' },
      sellerVerified: { score: 15, description: '卖家已认证' },
      supportsPlatformVerification: { score: 15, description: '支持平台验货' }
    };
  }

  /**
   * 综合检测商品真假风险
   */
  async detectFakeRisk(product) {
    const results = {
      productId: product.id,
      productTitle: product.title,
      analyzedAt: new Date().toISOString(),
      scores: {},
      totalScore: 0,
      riskLevel: 'unknown',
      warnings: [],
      suggestions: []
    };

    // 1. 图片质量分析
    const imageScore = await this.analyzeImageQuality(product.images);
    results.scores.imageQuality = imageScore;

    // 2. 水印分析
    const watermarkScore = await this.analyzeWatermarks(product.images);
    results.scores.watermarkAnalysis = watermarkScore;

    // 3. 价格异常检测
    const priceScore = this.analyzePriceAnomaly(product);
    results.scores.priceAnomaly = priceScore;

    // 4. 卖家信誉分析
    const sellerScore = await this.analyzeSellerReputation(product.seller);
    results.scores.sellerReputation = sellerScore;

    // 5. 描述文案分析
    const descScore = this.analyzeDescription(product);
    results.scores.descriptionAnalysis = descScore;

    // 6. 评论真实性分析
    const reviewScore = await this.analyzeReviewAuthenticity(product.reviews);
    results.scores.reviewAuthenticity = reviewScore;

    // 计算加权总分
    for (const [metric, weight] of Object.entries(this.detectionWeights)) {
      results.totalScore += (results.scores[metric]?.score || 50) * weight;
    }

    // 确定风险等级
    results.riskLevel = this.determineRiskLevel(results.totalScore);

    // 汇总警告
    for (const scoreData of Object.values(results.scores)) {
      if (scoreData.warnings) {
        results.warnings.push(...scoreData.warnings);
      }
    }

    // 生成建议
    results.suggestions = this.generateSuggestions(results);

    return results;
  }

  /**
   * 分析图片质量
   */
  async analyzeImageQuality(images) {
    if (!images || images.length === 0) {
      return {
        score: 30,
        warnings: ['无商品图片'],
        details: { imageCount: 0 }
      };
    }

    const issues = [];
    let qualityScore = 100;

    // 检查图片数量
    if (images.length < 3) {
      qualityScore -= 15;
      issues.push('图片数量过少');
    }

    // 模拟图片分析
    const analysisResults = {
      hasMainImage: true,
      hasDetailImages: images.length > 3,
      hasRealPhotos: true, // 实际需要AI识别
      imageResolution: 'high',
      isStockPhoto: false,
      hasInconsistentLighting: false
    };

    // 检查是否为网图盗用
    if (analysisResults.isStockPhoto) {
      qualityScore -= 30;
      issues.push('疑似使用网络图片');
    }

    // 检查光线一致性
    if (analysisResults.hasInconsistentLighting) {
      qualityScore -= 20;
      issues.push('图片光线不一致，可能来自不同来源');
    }

    // 检查是否有实拍图
    if (!analysisResults.hasRealPhotos) {
      qualityScore -= 25;
      issues.push('缺少实物实拍图');
    }

    return {
      score: Math.max(0, qualityScore),
      warnings: issues,
      details: {
        imageCount: images.length,
        ...analysisResults
      }
    };
  }

  /**
   * 分析图片水印
   */
  async analyzeWatermarks(images) {
    const issues = [];
    let score = 100;

    // 模拟水印检测
    const watermarkAnalysis = {
      hasSellerWatermark: true,
      hasOfficialWatermark: false,
      watermarkConsistency: true,
      suspiciousWatermarks: []
    };

    // 检查是否有可疑水印
    if (watermarkAnalysis.suspiciousWatermarks.length > 0) {
      score -= 30;
      issues.push('发现可疑水印');
    }

    // 检查水印一致性
    if (!watermarkAnalysis.watermarkConsistency) {
      score -= 20;
      issues.push('不同图片水印不一致');
    }

    return {
      score: Math.max(0, score),
      warnings: issues,
      details: watermarkAnalysis
    };
  }

  /**
   * 分析价格异常
   */
  analyzePriceAnomaly(product) {
    const issues = [];
    let score = 100;

    const price = product.price;
    const marketPrice = product.marketPrice || price * 1.5;
    const officialPrice = product.officialPrice || marketPrice * 1.2;

    // 计算折扣率
    const discountRate = (officialPrice - price) / officialPrice;

    // 高风险品牌 + 超低价格
    const isHighRiskBrand = this.highRiskBrands.some(brand =>
      product.title.toLowerCase().includes(brand.toLowerCase())
    );

    if (isHighRiskBrand) {
      if (discountRate > 0.7) {
        score -= 50;
        issues.push(`高端品牌折扣异常（${(discountRate * 100).toFixed(0)}% off）`);
      } else if (discountRate > 0.5) {
        score -= 30;
        issues.push(`品牌商品折扣较大（${(discountRate * 100).toFixed(0)}% off）`);
      }
    }

    // 价格过低警告
    if (price < officialPrice * 0.3) {
      score -= 40;
      issues.push('价格低于市场价70%');
    } else if (price < officialPrice * 0.5) {
      score -= 20;
      issues.push('价格明显低于市场价');
    }

    return {
      score: Math.max(0, score),
      warnings: issues,
      details: {
        currentPrice: price,
        marketPrice,
        officialPrice,
        discountRate: (discountRate * 100).toFixed(1) + '%',
        isHighRiskBrand
      }
    };
  }

  /**
   * 分析卖家信誉
   */
  async analyzeSellerReputation(seller) {
    if (!seller) {
      return {
        score: 40,
        warnings: ['无法获取卖家信息'],
        details: {}
      };
    }

    const issues = [];
    let score = 100;

    // 开店时长
    const shopAge = seller.shopAge || 0;
    if (shopAge < 3) {
      score -= 25;
      issues.push(`店铺较新（${shopAge}个月）`);
    } else if (shopAge < 12) {
      score -= 10;
    }

    // 评分
    const rating = seller.rating || 0;
    if (rating < 4.5) {
      score -= 20;
      issues.push(`店铺评分较低（${rating}分）`);
    } else if (rating < 4.8) {
      score -= 10;
    }

    // 销量
    const salesCount = seller.salesCount || 0;
    if (salesCount < 100) {
      score -= 15;
      issues.push('销量较少');
    }

    // 是否认证
    if (!seller.verified) {
      score -= 20;
      issues.push('卖家未通过平台认证');
    }

    // 是否品牌授权
    if (!seller.brandAuthorized) {
      score -= 15;
      issues.push('无品牌授权');
    }

    return {
      score: Math.max(0, score),
      warnings: issues,
      details: {
        shopAge,
        rating,
        salesCount,
        verified: seller.verified,
        brandAuthorized: seller.brandAuthorized
      }
    };
  }

  /**
   * 分析商品描述
   */
  analyzeDescription(product) {
    const issues = [];
    let score = 100;

    const title = (product.title || '').toLowerCase();
    const description = (product.description || '').toLowerCase();

    // 检查标题可疑词
    for (const keyword of this.suspiciousKeywords.title) {
      if (title.includes(keyword.toLowerCase())) {
        score -= 20;
        issues.push(`标题包含可疑词汇：${keyword}`);
      }
    }

    // 检查描述可疑词
    for (const keyword of this.suspiciousKeywords.description) {
      if (description.includes(keyword.toLowerCase())) {
        score -= 15;
        issues.push(`描述包含可疑词汇：${keyword}`);
      }
    }

    // 检查正品指标
    const positiveIndicators = [];
    for (const [indicator, config] of Object.entries(this.authenticityIndicators)) {
      if (this.checkIndicator(product, indicator)) {
        score += config.score * 0.3; // 正面加分但权重较低
        positiveIndicators.push(config.description);
      }
    }

    // 描述过短
    if (description.length < 50) {
      score -= 10;
      issues.push('商品描述过于简单');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      warnings: issues,
      positiveIndicators,
      details: {
        titleLength: title.length,
        descriptionLength: description.length
      }
    };
  }

  /**
   * 检查正品指标
   */
  checkIndicator(product, indicator) {
    // 简化实现 - 实际需要更复杂的检测
    const text = `${product.title} ${product.description || ''}`.toLowerCase();

    switch (indicator) {
      case 'hasOfficialCertificate':
        return text.includes('官方') && text.includes('认证');
      case 'hasReceiptPhoto':
        return text.includes('发票') || text.includes('小票');
      case 'hasSerialNumber':
        return text.includes('序列号') || text.includes('防伪');
      case 'supportsAuthenticationVerification':
        return text.includes('支持验') || text.includes('专柜验');
      default:
        return false;
    }
  }

  /**
   * 分析评论真实性
   */
  async analyzeReviewAuthenticity(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        score: 50,
        warnings: ['无用户评价'],
        details: { reviewCount: 0 }
      };
    }

    const issues = [];
    let score = 100;

    // 评论分析指标
    const analysis = {
      reviewCount: reviews.length,
      avgLength: 0,
      hasPhotos: 0,
      suspiciousPatterns: 0,
      timeDistribution: 'normal'
    };

    let totalLength = 0;
    const reviewTexts = new Set();
    const reviewDates = [];

    for (const review of reviews) {
      const text = review.content || '';
      totalLength += text.length;

      if (review.images && review.images.length > 0) {
        analysis.hasPhotos++;
      }

      // 检测重复评论
      if (reviewTexts.has(text)) {
        analysis.suspiciousPatterns++;
      }
      reviewTexts.add(text);

      if (review.date) {
        reviewDates.push(new Date(review.date));
      }
    }

    analysis.avgLength = totalLength / reviews.length;

    // 评论过短
    if (analysis.avgLength < 20) {
      score -= 15;
      issues.push('评论内容普遍过短');
    }

    // 无图评论过多
    if (analysis.hasPhotos / reviews.length < 0.1) {
      score -= 10;
      issues.push('带图评论比例过低');
    }

    // 发现可疑模式
    if (analysis.suspiciousPatterns > 3) {
      score -= 30;
      issues.push('发现多条相似/重复评论');
    }

    // 评论时间分布异常
    if (reviewDates.length > 10) {
      const timeGaps = [];
      for (let i = 1; i < reviewDates.length; i++) {
        timeGaps.push(reviewDates[i] - reviewDates[i - 1]);
      }
      const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
      const variance = timeGaps.reduce((sum, gap) =>
        sum + Math.pow(gap - avgGap, 2), 0) / timeGaps.length;

      if (variance < avgGap * 0.1) { // 时间分布过于均匀
        score -= 25;
        issues.push('评论时间分布异常均匀');
        analysis.timeDistribution = 'suspicious';
      }
    }

    return {
      score: Math.max(0, score),
      warnings: issues,
      details: analysis
    };
  }

  /**
   * 确定风险等级
   */
  determineRiskLevel(score) {
    if (score >= 80) return { level: 'low', label: '低风险', color: '#4CAF50' };
    if (score >= 60) return { level: 'medium', label: '中等风险', color: '#FF9800' };
    if (score >= 40) return { level: 'high', label: '高风险', color: '#f44336' };
    return { level: 'critical', label: '极高风险', color: '#b71c1c' };
  }

  /**
   * 生成建议
   */
  generateSuggestions(results) {
    const suggestions = [];

    if (results.riskLevel.level === 'critical' || results.riskLevel.level === 'high') {
      suggestions.push({
        priority: 'high',
        icon: '⚠️',
        text: '强烈建议不要购买此商品，假货风险极高'
      });
    }

    if (results.scores.priceAnomaly?.score < 50) {
      suggestions.push({
        priority: 'high',
        icon: '💰',
        text: '价格异常偏低，请对比官方渠道价格'
      });
    }

    if (results.scores.sellerReputation?.score < 60) {
      suggestions.push({
        priority: 'medium',
        icon: '🏪',
        text: '卖家信誉较低，建议选择其他店铺'
      });
    }

    // 验货建议
    if (results.riskLevel.level !== 'low') {
      suggestions.push({
        priority: 'medium',
        icon: '🔍',
        text: '购买后建议使用得物、识货等平台进行鉴定'
      });
    }

    // 保留证据
    suggestions.push({
      priority: 'low',
      icon: '📸',
      text: '收货时拍摄开箱视频，保留维权证据'
    });

    return suggestions;
  }

  /**
   * 生成检测报告
   */
  generateReport(results) {
    return {
      summary: {
        product: results.productTitle,
        totalScore: results.totalScore.toFixed(0),
        riskLevel: results.riskLevel.label,
        warningsCount: results.warnings.length
      },
      scores: Object.entries(results.scores).map(([metric, data]) => ({
        metric: this.getMetricLabel(metric),
        score: data.score,
        issues: data.warnings || []
      })),
      warnings: results.warnings,
      suggestions: results.suggestions,
      analyzedAt: results.analyzedAt
    };
  }

  /**
   * 获取指标标签
   */
  getMetricLabel(metric) {
    const labels = {
      imageQuality: '图片质量',
      watermarkAnalysis: '水印分析',
      priceAnomaly: '价格合理性',
      sellerReputation: '卖家信誉',
      descriptionAnalysis: '描述分析',
      reviewAuthenticity: '评论真实性'
    };
    return labels[metric] || metric;
  }

  /**
   * 快速风险评估
   */
  quickRiskCheck(product) {
    let riskScore = 0;
    const redFlags = [];

    // 检查高风险品牌 + 低价
    const isHighRiskBrand = this.highRiskBrands.some(brand =>
      product.title.toLowerCase().includes(brand.toLowerCase())
    );

    if (isHighRiskBrand && product.price < product.marketPrice * 0.5) {
      riskScore += 40;
      redFlags.push('高端品牌异常低价');
    }

    // 检查可疑关键词
    for (const keyword of this.suspiciousKeywords.title) {
      if (product.title.toLowerCase().includes(keyword.toLowerCase())) {
        riskScore += 20;
        redFlags.push(`可疑词汇: ${keyword}`);
        break;
      }
    }

    return {
      riskScore: Math.min(100, riskScore),
      redFlags,
      needsFullAnalysis: riskScore > 30
    };
  }
}
