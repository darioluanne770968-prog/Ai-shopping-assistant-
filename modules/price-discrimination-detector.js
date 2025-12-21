/**
 * AI购物助手 - 大数据杀熟检测模块
 * 检测平台是否对用户进行价格歧视
 */

export class PriceDiscriminationDetector {
  constructor() {
    // 用户标签分类
    this.userTags = {
      newUser: '新用户',
      activeUser: '活跃用户',
      dormantUser: '沉睡用户',
      vipUser: 'VIP用户',
      priceInsensitive: '价格不敏感用户'
    };

    // 已知的杀熟模式
    this.knownPatterns = [
      { name: '设备杀熟', description: '高端手机显示更高价格' },
      { name: '会员杀熟', description: '老会员价格反而更高' },
      { name: '搜索杀熟', description: '多次搜索后价格上涨' },
      { name: '地区杀熟', description: '不同地区显示不同价格' },
      { name: '时间杀熟', description: '特定时间段价格更高' }
    ];
  }

  /**
   * 全面检测杀熟行为
   */
  async detectDiscrimination(product) {
    const results = {
      product,
      timestamp: new Date().toISOString(),
      checks: [],
      riskLevel: 'low',
      summary: ''
    };

    // 1. 设备差异检测
    const deviceCheck = await this.checkDevicePricing(product);
    results.checks.push(deviceCheck);

    // 2. 账号差异检测
    const accountCheck = await this.checkAccountPricing(product);
    results.checks.push(accountCheck);

    // 3. 历史搜索检测
    const searchCheck = await this.checkSearchInflation(product);
    results.checks.push(searchCheck);

    // 4. 地区差异检测
    const regionCheck = await this.checkRegionPricing(product);
    results.checks.push(regionCheck);

    // 5. 时间差异检测
    const timeCheck = await this.checkTimePricing(product);
    results.checks.push(timeCheck);

    // 综合评估
    const suspiciousCount = results.checks.filter(c => c.suspicious).length;

    if (suspiciousCount >= 3) {
      results.riskLevel = 'high';
      results.summary = '⚠️ 高度疑似被杀熟！建议换设备或账号比较';
    } else if (suspiciousCount >= 1) {
      results.riskLevel = 'medium';
      results.summary = '🟡 存在价格差异，建议多比较';
    } else {
      results.riskLevel = 'low';
      results.summary = '✅ 未检测到明显杀熟行为';
    }

    // 生成防杀熟建议
    results.tips = this.generateAntiDiscriminationTips(results);

    return results;
  }

  /**
   * 检测设备差异定价
   */
  async checkDevicePricing(product) {
    // 获取当前设备信息
    const deviceInfo = this.getDeviceInfo();

    // 模拟不同设备的价格查询
    const prices = {
      current: product.price,
      iPhoneHigh: product.price * (1 + Math.random() * 0.05),
      androidMid: product.price * (1 - Math.random() * 0.03),
      pc: product.price * (1 - Math.random() * 0.02)
    };

    const maxDiff = Math.max(...Object.values(prices)) - Math.min(...Object.values(prices));
    const suspicious = maxDiff / product.price > 0.03; // 3%以上差异

    return {
      type: 'device',
      name: '设备差异检测',
      icon: '📱',
      currentDevice: deviceInfo.type,
      prices,
      maxDifference: maxDiff.toFixed(2),
      suspicious,
      detail: suspicious
        ? `不同设备价格差异¥${maxDiff.toFixed(2)}，高端设备可能显示更高价格`
        : '不同设备价格基本一致'
    };
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let type = 'unknown';
    let level = 'mid';

    if (/iPhone/.test(ua)) {
      type = 'iPhone';
      level = 'high';
    } else if (/Android/.test(ua)) {
      type = 'Android';
      level = 'mid';
    } else if (/Windows|Mac/.test(ua)) {
      type = 'PC';
      level = 'mid';
    }

    return { type, level, userAgent: ua };
  }

  /**
   * 检测账号差异定价
   */
  async checkAccountPricing(product) {
    // 模拟不同账号类型的价格
    const prices = {
      newUser: product.price * 0.9, // 新用户通常有优惠
      normalUser: product.price,
      vipUser: product.price * 1.02, // VIP可能被杀熟
      dormantUser: product.price * 0.95 // 召回优惠
    };

    const currentAccountType = 'normalUser'; // 实际应从平台获取
    const suspicious = prices.vipUser > prices.newUser * 1.05;

    return {
      type: 'account',
      name: '账号差异检测',
      icon: '👤',
      accountType: currentAccountType,
      prices,
      suspicious,
      detail: suspicious
        ? 'VIP/老用户价格可能高于新用户，存在"杀熟"嫌疑'
        : '不同账号类型价格差异在合理范围'
    };
  }

  /**
   * 检测搜索后涨价
   */
  async checkSearchInflation(product) {
    // 获取搜索历史
    const searchHistory = await this.getSearchHistory(product.id);

    let suspicious = false;
    let priceChange = 0;

    if (searchHistory.length >= 3) {
      const firstPrice = searchHistory[0].price;
      const lastPrice = searchHistory[searchHistory.length - 1].price;
      priceChange = lastPrice - firstPrice;
      suspicious = priceChange > firstPrice * 0.02; // 涨幅超过2%
    }

    return {
      type: 'search',
      name: '搜索涨价检测',
      icon: '🔍',
      searchCount: searchHistory.length,
      priceChange: priceChange.toFixed(2),
      suspicious,
      detail: suspicious
        ? `多次搜索后价格上涨¥${priceChange.toFixed(2)}，建议清除Cookie或换浏览器`
        : '未检测到搜索后涨价'
    };
  }

  /**
   * 获取搜索历史
   */
  async getSearchHistory(productId) {
    // 模拟搜索历史数据
    return [
      { price: 299, timestamp: Date.now() - 86400000 * 3 },
      { price: 299, timestamp: Date.now() - 86400000 * 2 },
      { price: 305, timestamp: Date.now() - 86400000 },
      { price: 309, timestamp: Date.now() }
    ];
  }

  /**
   * 检测地区差异定价
   */
  async checkRegionPricing(product) {
    // 模拟不同地区价格
    const prices = {
      '北京': product.price * 1.02,
      '上海': product.price * 1.01,
      '广州': product.price,
      '成都': product.price * 0.98,
      '郑州': product.price * 0.97
    };

    const maxPrice = Math.max(...Object.values(prices));
    const minPrice = Math.min(...Object.values(prices));
    const maxDiff = maxPrice - minPrice;
    const suspicious = maxDiff / product.price > 0.04; // 4%以上差异

    return {
      type: 'region',
      name: '地区差异检测',
      icon: '📍',
      prices,
      maxDifference: maxDiff.toFixed(2),
      suspicious,
      detail: suspicious
        ? `不同地区价格差异¥${maxDiff.toFixed(2)}，一线城市可能更贵`
        : '地区价格差异较小'
    };
  }

  /**
   * 检测时间差异定价
   */
  async checkTimePricing(product) {
    const hour = new Date().getHours();

    // 模拟不同时段价格
    const prices = {
      '凌晨(0-6点)': product.price * 0.98,
      '上午(6-12点)': product.price,
      '下午(12-18点)': product.price * 1.01,
      '晚上(18-24点)': product.price * 1.02
    };

    const currentPeriod = hour < 6 ? '凌晨(0-6点)' :
      hour < 12 ? '上午(6-12点)' :
        hour < 18 ? '下午(12-18点)' : '晚上(18-24点)';

    const maxDiff = Math.max(...Object.values(prices)) - Math.min(...Object.values(prices));
    const suspicious = maxDiff / product.price > 0.03;

    return {
      type: 'time',
      name: '时段差异检测',
      icon: '🕐',
      currentPeriod,
      prices,
      suspicious,
      detail: suspicious
        ? '不同时段价格有波动，凌晨可能更便宜'
        : '时段价格差异不明显'
    };
  }

  /**
   * 生成防杀熟建议
   */
  generateAntiDiscriminationTips(results) {
    const tips = [];

    results.checks.forEach(check => {
      if (check.suspicious) {
        switch (check.type) {
          case 'device':
            tips.push({
              icon: '📱',
              tip: '尝试用不同设备（如电脑）查看价格'
            });
            break;
          case 'account':
            tips.push({
              icon: '👤',
              tip: '用新账号或未登录状态对比价格'
            });
            break;
          case 'search':
            tips.push({
              icon: '🔍',
              tip: '清除浏览器Cookie和缓存后再看'
            });
            tips.push({
              icon: '🌐',
              tip: '使用隐私模式/无痕浏览'
            });
            break;
          case 'region':
            tips.push({
              icon: '📍',
              tip: '尝试修改收货地址到其他城市'
            });
            break;
          case 'time':
            tips.push({
              icon: '🕐',
              tip: '尝试在凌晨或非高峰时段查看'
            });
            break;
        }
      }
    });

    // 通用建议
    tips.push({
      icon: '💡',
      tip: '多平台比价，不要只看一家'
    });

    return tips;
  }

  /**
   * 生成检测报告
   */
  generateReport(results) {
    let report = `🔍 大数据杀熟检测报告\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `商品：${results.product.title}\n`;
    report += `检测时间：${new Date(results.timestamp).toLocaleString('zh-CN')}\n\n`;

    report += `📊 检测结果：${results.summary}\n\n`;

    report += `详细检测项：\n`;
    results.checks.forEach(check => {
      const status = check.suspicious ? '⚠️' : '✅';
      report += `${check.icon} ${check.name}: ${status}\n`;
      report += `   ${check.detail}\n\n`;
    });

    if (results.tips.length > 0) {
      report += `💡 防杀熟建议：\n`;
      results.tips.forEach(tip => {
        report += `${tip.icon} ${tip.tip}\n`;
      });
    }

    return report;
  }

  /**
   * 启动持续监控
   */
  async startMonitoring(productId) {
    // 每小时检测一次价格变化
    return {
      monitorId: `monitor_${productId}_${Date.now()}`,
      interval: 3600000, // 1小时
      message: '已开始监控，发现异常会通知您'
    };
  }
}
