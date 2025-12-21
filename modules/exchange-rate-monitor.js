/**
 * AI购物助手 - 汇率监控模块
 * 海淘汇率追踪、最佳购汇时机、跨境比价
 */

export class ExchangeRateMonitor {
  constructor() {
    this.rates = new Map();
    this.historicalRates = new Map();
    this.alerts = [];

    // 支持的货币
    this.currencies = {
      USD: { name: '美元', symbol: '$', flag: '🇺🇸' },
      EUR: { name: '欧元', symbol: '€', flag: '🇪🇺' },
      GBP: { name: '英镑', symbol: '£', flag: '🇬🇧' },
      JPY: { name: '日元', symbol: '¥', flag: '🇯🇵' },
      KRW: { name: '韩元', symbol: '₩', flag: '🇰🇷' },
      HKD: { name: '港币', symbol: 'HK$', flag: '🇭🇰' },
      AUD: { name: '澳元', symbol: 'A$', flag: '🇦🇺' },
      CAD: { name: '加元', symbol: 'C$', flag: '🇨🇦' },
      SGD: { name: '新加坡元', symbol: 'S$', flag: '🇸🇬' },
      NZD: { name: '新西兰元', symbol: 'NZ$', flag: '🇳🇿' },
      THB: { name: '泰铢', symbol: '฿', flag: '🇹🇭' },
      MYR: { name: '马来西亚林吉特', symbol: 'RM', flag: '🇲🇾' }
    };

    // 海淘平台与货币映射
    this.platformCurrencies = {
      'amazon.com': 'USD',
      'amazon.co.uk': 'GBP',
      'amazon.de': 'EUR',
      'amazon.co.jp': 'JPY',
      'rakuten.co.jp': 'JPY',
      'ebay.com': 'USD',
      'iherb.com': 'USD',
      'gmarket.co.kr': 'KRW',
      'coupang.com': 'KRW',
      'hktvmall.com': 'HKD',
      'lookfantastic.com': 'GBP',
      'chemistwarehouse.com.au': 'AUD'
    };

    // 银行/渠道购汇费率
    this.exchangeChannels = {
      bank_icbc: { name: '工商银行', spread: 0.003, fee: 0 },
      bank_boc: { name: '中国银行', spread: 0.0025, fee: 0 },
      bank_cmb: { name: '招商银行', spread: 0.003, fee: 0 },
      alipay: { name: '支付宝', spread: 0.002, fee: 0 },
      wechat: { name: '微信支付', spread: 0.002, fee: 0 },
      visa: { name: 'Visa卡', spread: 0.015, fee: 1.5 }, // 1.5%货币转换费
      mastercard: { name: 'MasterCard', spread: 0.015, fee: 1.5 },
      unionpay: { name: '银联', spread: 0.01, fee: 0 }
    };
  }

  /**
   * 获取实时汇率
   */
  async fetchRates(baseCurrency = 'CNY') {
    try {
      // 模拟汇率数据（实际应调用汇率API）
      const mockRates = {
        USD: 7.24,
        EUR: 7.89,
        GBP: 9.18,
        JPY: 0.0483,
        KRW: 0.00542,
        HKD: 0.926,
        AUD: 4.71,
        CAD: 5.32,
        SGD: 5.39,
        NZD: 4.35,
        THB: 0.203,
        MYR: 1.62
      };

      const timestamp = new Date().toISOString();

      for (const [currency, rate] of Object.entries(mockRates)) {
        this.rates.set(currency, {
          rate,
          timestamp,
          change24h: (Math.random() - 0.5) * 0.02 // 模拟波动
        });

        // 保存历史数据
        this.addHistoricalRate(currency, rate, timestamp);
      }

      return {
        success: true,
        rates: Object.fromEntries(this.rates),
        timestamp
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 添加历史汇率数据
   */
  addHistoricalRate(currency, rate, timestamp) {
    if (!this.historicalRates.has(currency)) {
      this.historicalRates.set(currency, []);
    }

    const history = this.historicalRates.get(currency);
    history.push({ rate, timestamp });

    // 只保留90天数据
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    this.historicalRates.set(currency,
      history.filter(h => new Date(h.timestamp) > cutoff)
    );
  }

  /**
   * 转换货币
   */
  convert(amount, fromCurrency, toCurrency = 'CNY') {
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1 };
    }

    const fromRate = fromCurrency === 'CNY' ? 1 : this.rates.get(fromCurrency)?.rate;
    const toRate = toCurrency === 'CNY' ? 1 : this.rates.get(toCurrency)?.rate;

    if (!fromRate || !toRate) {
      throw new Error('汇率数据不可用');
    }

    // 转换为人民币再转换为目标货币
    const cnyAmount = amount * fromRate;
    const convertedAmount = cnyAmount / toRate;

    return {
      amount: convertedAmount,
      rate: fromRate / toRate,
      cnyAmount
    };
  }

  /**
   * 计算海淘商品的人民币价格
   */
  calculateCrossBorderPrice(product, options = {}) {
    const currency = this.detectCurrency(product.platform);
    const baseRate = this.rates.get(currency)?.rate;

    if (!baseRate) {
      return { error: '无法获取汇率' };
    }

    const channel = options.paymentChannel || 'alipay';
    const channelInfo = this.exchangeChannels[channel];

    // 基础转换
    const basePrice = product.price * baseRate;

    // 加上汇率点差
    const spreadCost = basePrice * channelInfo.spread;

    // 加上货币转换费
    const conversionFee = basePrice * (channelInfo.fee / 100);

    // 估算运费
    const shippingCost = this.estimateShipping(product, options.shippingMethod);

    // 估算关税
    const duties = this.estimateDuties(product, basePrice);

    const totalPrice = basePrice + spreadCost + conversionFee + shippingCost + duties.amount;

    return {
      originalPrice: product.price,
      currency,
      exchangeRate: baseRate,
      breakdown: {
        basePrice: basePrice.toFixed(2),
        spreadCost: spreadCost.toFixed(2),
        conversionFee: conversionFee.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        duties: duties.amount.toFixed(2),
        dutiesNote: duties.note
      },
      totalPrice: totalPrice.toFixed(2),
      paymentChannel: channelInfo.name
    };
  }

  /**
   * 检测平台货币
   */
  detectCurrency(platform) {
    for (const [domain, currency] of Object.entries(this.platformCurrencies)) {
      if (platform.includes(domain)) {
        return currency;
      }
    }
    return 'USD';
  }

  /**
   * 估算运费
   */
  estimateShipping(product, method = 'standard') {
    const methods = {
      standard: { baseRate: 30, perKg: 35, days: '15-30天' },
      express: { baseRate: 50, perKg: 60, days: '7-15天' },
      premium: { baseRate: 80, perKg: 100, days: '3-7天' }
    };

    const config = methods[method] || methods.standard;
    const estimatedWeight = product.weight || 0.5; // 默认0.5kg

    return config.baseRate + config.perKg * Math.max(0, estimatedWeight - 0.5);
  }

  /**
   * 估算关税
   */
  estimateDuties(product, cnyValue) {
    // 中国海关税率（简化版）
    const dutyRates = {
      electronics: 0.15,
      cosmetics: 0.30,
      clothing: 0.20,
      food: 0.15,
      baby: 0.13,
      health: 0.13,
      luxury: 0.30
    };

    // 行邮税起征点（个人物品）
    const threshold = 50;

    // 检测商品类别
    const category = this.detectCategory(product.title);
    const rate = dutyRates[category] || 0.15;

    // 计算税费
    const dutyAmount = cnyValue * rate;

    if (dutyAmount < threshold) {
      return { amount: 0, note: '低于起征点，免税' };
    }

    return {
      amount: dutyAmount,
      note: `${category}类商品，税率${rate * 100}%`,
      category,
      rate
    };
  }

  /**
   * 检测商品类别
   */
  detectCategory(title) {
    const keywords = {
      electronics: ['电子', '手机', '电脑', '数码', 'iPhone', 'iPad', 'MacBook'],
      cosmetics: ['化妆品', '护肤', '美妆', '口红', '面膜', '精华'],
      clothing: ['服装', '衣服', '鞋', '包', '服饰'],
      food: ['食品', '零食', '保健品', '奶粉'],
      baby: ['婴儿', '宝宝', '母婴', '纸尿裤'],
      health: ['保健', '维生素', '营养', '药品'],
      luxury: ['奢侈品', 'LV', 'Gucci', 'Chanel', '爱马仕']
    };

    const lowerTitle = title.toLowerCase();
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerTitle.includes(word.toLowerCase()))) {
        return category;
      }
    }
    return 'general';
  }

  /**
   * 设置汇率提醒
   */
  async setRateAlert(currency, targetRate, direction = 'below') {
    const alert = {
      id: `alert_${Date.now()}`,
      currency,
      targetRate,
      direction, // 'below' 或 'above'
      currentRate: this.rates.get(currency)?.rate,
      createdAt: new Date().toISOString(),
      triggered: false
    };

    this.alerts.push(alert);
    await this.saveAlerts();

    return {
      success: true,
      alert,
      message: `已设置提醒：当${this.currencies[currency].name}汇率${direction === 'below' ? '低于' : '高于'}${targetRate}时通知您`
    };
  }

  /**
   * 检查汇率提醒
   */
  async checkAlerts() {
    const triggered = [];

    for (const alert of this.alerts) {
      if (alert.triggered) continue;

      const currentRate = this.rates.get(alert.currency)?.rate;
      if (!currentRate) continue;

      let shouldTrigger = false;
      if (alert.direction === 'below' && currentRate <= alert.targetRate) {
        shouldTrigger = true;
      } else if (alert.direction === 'above' && currentRate >= alert.targetRate) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        alert.triggered = true;
        alert.triggeredAt = new Date().toISOString();
        alert.triggeredRate = currentRate;
        triggered.push(alert);

        // 发送通知
        this.sendRateNotification(alert);
      }
    }

    if (triggered.length > 0) {
      await this.saveAlerts();
    }

    return triggered;
  }

  /**
   * 发送汇率通知
   */
  sendRateNotification(alert) {
    const currencyInfo = this.currencies[alert.currency];
    chrome.notifications.create(`rate_${alert.id}`, {
      type: 'basic',
      iconUrl: '/assets/icons/icon128.png',
      title: `${currencyInfo.flag} 汇率提醒`,
      message: `${currencyInfo.name}汇率已${alert.direction === 'below' ? '降至' : '升至'}${alert.triggeredRate.toFixed(4)}`,
      priority: 2
    });
  }

  /**
   * 分析最佳购汇时机
   */
  analyzeBestTime(currency) {
    const history = this.historicalRates.get(currency) || [];
    if (history.length < 7) {
      return { suggestion: '数据不足', confidence: 0 };
    }

    const currentRate = this.rates.get(currency)?.rate;
    const rates = history.map(h => h.rate);

    // 计算统计指标
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const std = Math.sqrt(rates.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / rates.length);

    // 计算当前汇率在历史中的位置
    const percentile = rates.filter(r => r <= currentRate).length / rates.length * 100;

    // 计算趋势
    const recentRates = rates.slice(-7);
    const trend = (recentRates[recentRates.length - 1] - recentRates[0]) / recentRates[0];

    let suggestion, timing, confidence;

    if (percentile <= 20 && trend <= 0) {
      suggestion = '强烈建议现在购汇';
      timing = 'now';
      confidence = 0.9;
    } else if (percentile <= 40) {
      suggestion = '当前汇率较低，可以考虑购汇';
      timing = 'good';
      confidence = 0.7;
    } else if (percentile >= 80 && trend >= 0) {
      suggestion = '当前汇率偏高，建议等待更好时机';
      timing = 'wait';
      confidence = 0.8;
    } else if (trend < -0.01) {
      suggestion = '汇率呈下降趋势，可再观望几天';
      timing = 'observe';
      confidence = 0.6;
    } else {
      suggestion = '汇率处于正常区间，按需购汇即可';
      timing = 'normal';
      confidence = 0.5;
    }

    return {
      suggestion,
      timing,
      confidence,
      analysis: {
        currentRate,
        average: avg.toFixed(4),
        min: min.toFixed(4),
        max: max.toFixed(4),
        percentile: percentile.toFixed(1),
        trend: (trend * 100).toFixed(2) + '%',
        volatility: (std / avg * 100).toFixed(2) + '%'
      }
    };
  }

  /**
   * 比较不同购汇渠道
   */
  compareChannels(amount, currency) {
    const baseRate = this.rates.get(currency)?.rate;
    if (!baseRate) return [];

    return Object.entries(this.exchangeChannels).map(([id, channel]) => {
      const effectiveRate = baseRate * (1 + channel.spread);
      const cnyAmount = amount * effectiveRate;
      const fee = cnyAmount * (channel.fee / 100);
      const total = cnyAmount + fee;

      return {
        id,
        name: channel.name,
        effectiveRate: effectiveRate.toFixed(4),
        cnyAmount: cnyAmount.toFixed(2),
        fee: fee.toFixed(2),
        total: total.toFixed(2)
      };
    }).sort((a, b) => parseFloat(a.total) - parseFloat(b.total));
  }

  /**
   * 生成汇率走势图数据
   */
  getChartData(currency, days = 30) {
    const history = this.historicalRates.get(currency) || [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const filteredData = history.filter(h => new Date(h.timestamp) > cutoff);

    return {
      labels: filteredData.map(h => {
        const date = new Date(h.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      data: filteredData.map(h => h.rate),
      currency,
      currencyInfo: this.currencies[currency]
    };
  }

  /**
   * 保存提醒
   */
  async saveAlerts() {
    return new Promise(resolve => {
      chrome.storage.local.set({ rateAlerts: this.alerts }, resolve);
    });
  }

  /**
   * 加载提醒
   */
  async loadAlerts() {
    return new Promise(resolve => {
      chrome.storage.local.get(['rateAlerts'], result => {
        this.alerts = result.rateAlerts || [];
        resolve(this.alerts);
      });
    });
  }

  /**
   * 获取支持的货币列表
   */
  getSupportedCurrencies() {
    return Object.entries(this.currencies).map(([code, info]) => ({
      code,
      ...info,
      rate: this.rates.get(code)?.rate
    }));
  }
}
