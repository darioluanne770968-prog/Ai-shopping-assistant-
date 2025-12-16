/**
 * AI购物助手 - 价格预测模块
 * 基于历史数据预测未来价格走势
 */

export class PricePredictor {
  constructor() {
    // 大促日期配置
    this.majorSales = [
      { name: '年货节', month: 1, startDay: 10, endDay: 20, discount: 0.15 },
      { name: '38女王节', month: 3, startDay: 1, endDay: 8, discount: 0.12 },
      { name: '618', month: 6, startDay: 1, endDay: 20, discount: 0.25 },
      { name: '818', month: 8, startDay: 15, endDay: 20, discount: 0.10 },
      { name: '99大促', month: 9, startDay: 1, endDay: 9, discount: 0.12 },
      { name: '双11', month: 11, startDay: 1, endDay: 11, discount: 0.30 },
      { name: '双12', month: 12, startDay: 5, endDay: 12, discount: 0.18 }
    ];
  }

  /**
   * 预测未来价格
   * @param {Object} product - 商品信息
   * @param {Array} priceHistory - 历史价格数据
   * @param {number} days - 预测天数
   */
  predict(product, priceHistory, days = 30) {
    if (!priceHistory || priceHistory.length < 7) {
      return this.simplePredict(product.price, days);
    }

    // 分析历史趋势
    const trend = this.analyzeTrend(priceHistory);

    // 检测周期性
    const seasonality = this.detectSeasonality(priceHistory);

    // 获取即将到来的大促
    const upcomingSales = this.getUpcomingSales(days);

    // 生成预测
    const predictions = this.generatePredictions(
      product.price,
      trend,
      seasonality,
      upcomingSales,
      days
    );

    return {
      predictions,
      trend,
      seasonality,
      upcomingSales,
      recommendation: this.generateRecommendation(predictions, product.price),
      confidence: this.calculateConfidence(priceHistory.length, trend.stability)
    };
  }

  /**
   * 分析价格趋势
   */
  analyzeTrend(priceHistory) {
    const prices = priceHistory.map(h => h.price);
    const n = prices.length;

    // 计算线性回归
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += prices[i];
      sumXY += i * prices[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算价格波动
    const mean = sumY / n;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 判断趋势方向
    let direction;
    if (slope > 0.5) direction = 'up';
    else if (slope < -0.5) direction = 'down';
    else direction = 'stable';

    return {
      direction,
      slope,
      intercept,
      mean,
      stdDev,
      stability: 1 - (stdDev / mean), // 稳定性指标
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }

  /**
   * 检测季节性
   */
  detectSeasonality(priceHistory) {
    // 简化的季节性检测
    // 检查是否在大促期间价格明显下降
    const pricesByMonth = {};

    priceHistory.forEach(h => {
      const month = new Date(h.date).getMonth() + 1;
      if (!pricesByMonth[month]) {
        pricesByMonth[month] = [];
      }
      pricesByMonth[month].push(h.price);
    });

    const monthlyAvg = {};
    Object.entries(pricesByMonth).forEach(([month, prices]) => {
      monthlyAvg[month] = prices.reduce((a, b) => a + b, 0) / prices.length;
    });

    // 找出低价月份
    const avgPrice = Object.values(monthlyAvg).reduce((a, b) => a + b, 0) / Object.values(monthlyAvg).length;
    const lowPriceMonths = Object.entries(monthlyAvg)
      .filter(([_, avg]) => avg < avgPrice * 0.9)
      .map(([month]) => parseInt(month));

    return {
      detected: lowPriceMonths.length > 0,
      lowPriceMonths,
      monthlyAvg
    };
  }

  /**
   * 获取即将到来的大促
   */
  getUpcomingSales(days) {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const upcoming = [];

    for (const sale of this.majorSales) {
      const saleStart = new Date(now.getFullYear(), sale.month - 1, sale.startDay);
      const saleEnd = new Date(now.getFullYear(), sale.month - 1, sale.endDay);

      // 如果今年的已过，检查明年的
      if (saleEnd < now) {
        saleStart.setFullYear(saleStart.getFullYear() + 1);
        saleEnd.setFullYear(saleEnd.getFullYear() + 1);
      }

      if (saleStart <= endDate) {
        upcoming.push({
          ...sale,
          startDate: saleStart,
          endDate: saleEnd,
          daysUntil: Math.ceil((saleStart - now) / (1000 * 60 * 60 * 24))
        });
      }
    }

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * 生成价格预测
   */
  generatePredictions(currentPrice, trend, seasonality, upcomingSales, days) {
    const predictions = [];
    const now = new Date();

    for (let i = 1; i <= days; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);

      // 基础趋势价格
      let predictedPrice = currentPrice + trend.slope * i;

      // 应用大促折扣
      for (const sale of upcomingSales) {
        if (date >= sale.startDate && date <= sale.endDate) {
          predictedPrice *= (1 - sale.discount);
          break;
        }
      }

      // 添加随机波动
      const noise = (Math.random() - 0.5) * trend.stdDev * 0.2;
      predictedPrice += noise;

      // 确保价格不低于历史最低的80%
      predictedPrice = Math.max(predictedPrice, trend.min * 0.8);

      predictions.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(predictedPrice * 100) / 100,
        isSale: upcomingSales.some(s => date >= s.startDate && date <= s.endDate),
        saleName: upcomingSales.find(s => date >= s.startDate && date <= s.endDate)?.name
      });
    }

    return predictions;
  }

  /**
   * 简单预测（缺少历史数据时）
   */
  simplePredict(currentPrice, days) {
    const predictions = [];
    const now = new Date();
    const upcomingSales = this.getUpcomingSales(days);

    for (let i = 1; i <= days; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      let price = currentPrice;

      // 检查是否在大促期间
      for (const sale of upcomingSales) {
        if (date >= sale.startDate && date <= sale.endDate) {
          price *= (1 - sale.discount);
          break;
        }
      }

      predictions.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        isSale: upcomingSales.some(s => date >= s.startDate && date <= s.endDate),
        saleName: upcomingSales.find(s => date >= s.startDate && date <= s.endDate)?.name
      });
    }

    return {
      predictions,
      trend: { direction: 'unknown' },
      seasonality: { detected: false },
      upcomingSales,
      recommendation: this.generateSimpleRecommendation(upcomingSales, currentPrice),
      confidence: 0.3
    };
  }

  /**
   * 生成购买建议
   */
  generateRecommendation(predictions, currentPrice) {
    const minPrediction = Math.min(...predictions.map(p => p.price));
    const salePredictions = predictions.filter(p => p.isSale);

    if (currentPrice <= minPrediction * 1.02) {
      return {
        action: 'buy_now',
        reason: '当前价格已接近预测最低价，建议立即购买',
        emoji: '🎉',
        savings: 0
      };
    }

    if (salePredictions.length > 0) {
      const nextSale = salePredictions[0];
      const savings = currentPrice - nextSale.price;

      return {
        action: 'wait',
        reason: `建议等待${nextSale.saleName}，预计可省¥${savings.toFixed(0)}`,
        emoji: '⏰',
        savings,
        waitUntil: nextSale.date,
        saleName: nextSale.saleName
      };
    }

    return {
      action: 'monitor',
      reason: '价格波动不大，可以考虑现在购买',
      emoji: '🤔',
      savings: 0
    };
  }

  /**
   * 简单推荐
   */
  generateSimpleRecommendation(upcomingSales, currentPrice) {
    if (upcomingSales.length > 0 && upcomingSales[0].daysUntil <= 30) {
      const sale = upcomingSales[0];
      const expectedPrice = currentPrice * (1 - sale.discount);
      const savings = currentPrice - expectedPrice;

      return {
        action: 'wait',
        reason: `${sale.name}即将到来（${sale.daysUntil}天后），预计可省¥${savings.toFixed(0)}`,
        emoji: '⏰',
        savings,
        waitUntil: sale.startDate.toISOString().split('T')[0],
        saleName: sale.name
      };
    }

    return {
      action: 'buy_now',
      reason: '近期没有大促，可以考虑现在购买',
      emoji: '✅',
      savings: 0
    };
  }

  /**
   * 计算预测置信度
   */
  calculateConfidence(dataPoints, stability) {
    // 数据点越多，稳定性越高，置信度越高
    const dataScore = Math.min(dataPoints / 90, 1) * 0.5; // 最高0.5
    const stabilityScore = stability * 0.5; // 最高0.5

    return Math.round((dataScore + stabilityScore) * 100) / 100;
  }

  /**
   * 获取最佳购买时机
   */
  getBestBuyingTime(predictions) {
    if (!predictions || predictions.length === 0) return null;

    let minPrice = Infinity;
    let bestDay = null;

    predictions.forEach(p => {
      if (p.price < minPrice) {
        minPrice = p.price;
        bestDay = p;
      }
    });

    return bestDay;
  }

  /**
   * 获取大促日历
   */
  getSalesCalendar(year) {
    return this.majorSales.map(sale => ({
      name: sale.name,
      startDate: `${year}-${String(sale.month).padStart(2, '0')}-${String(sale.startDay).padStart(2, '0')}`,
      endDate: `${year}-${String(sale.month).padStart(2, '0')}-${String(sale.endDay).padStart(2, '0')}`,
      expectedDiscount: `${Math.round(sale.discount * 100)}%`
    }));
  }
}
