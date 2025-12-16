/**
 * AI购物助手 - 存储管理模块
 * 处理本地存储、心愿单、提醒、设置等
 */

export class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
    this.syncStorage = chrome.storage.sync;
  }

  /**
   * 初始化默认设置
   */
  async initializeDefaults() {
    const defaults = {
      settings: {
        autoCompare: true,
        showFloatingPanel: true,
        notificationsEnabled: true,
        priceCheckInterval: 60, // 分钟
        platforms: {
          taobao: true,
          tmall: true,
          jd: true,
          pdd: true,
          suning: true,
          vipshop: true,
          amazon: true,
          dangdang: true
        },
        theme: 'light',
        language: 'zh-CN'
      },
      wishlist: [],
      alerts: [],
      priceHistory: {},
      statistics: {
        totalSaved: 0,
        comparisons: 0,
        alertsTriggered: 0
      }
    };

    const existing = await this.storage.get(Object.keys(defaults));

    // 只设置不存在的默认值
    const toSet = {};
    Object.keys(defaults).forEach(key => {
      if (!existing[key]) {
        toSet[key] = defaults[key];
      }
    });

    if (Object.keys(toSet).length > 0) {
      await this.storage.set(toSet);
    }
  }

  // ==================== 设置相关 ====================

  /**
   * 获取设置
   */
  async getSettings() {
    const result = await this.storage.get('settings');
    return result.settings || {};
  }

  /**
   * 保存设置
   */
  async saveSettings(settings) {
    const current = await this.getSettings();
    await this.storage.set({
      settings: { ...current, ...settings }
    });
  }

  /**
   * 获取单个设置项
   */
  async getSetting(key) {
    const settings = await this.getSettings();
    return settings[key];
  }

  // ==================== 心愿单相关 ====================

  /**
   * 获取心愿单
   */
  async getWishlist() {
    const result = await this.storage.get('wishlist');
    return result.wishlist || [];
  }

  /**
   * 添加到心愿单
   */
  async addToWishlist(product) {
    const wishlist = await this.getWishlist();

    // 检查是否已存在
    const exists = wishlist.find(item => item.id === product.id);
    if (exists) {
      return { success: false, message: '商品已在心愿单中' };
    }

    const wishlistItem = {
      ...product,
      addedAt: new Date().toISOString(),
      originalPrice: product.price,
      currentPrice: product.price,
      priceChange: 0
    };

    wishlist.unshift(wishlistItem);
    await this.storage.set({ wishlist });

    return { success: true, message: '已添加到心愿单' };
  }

  /**
   * 从心愿单移除
   */
  async removeFromWishlist(productId) {
    const wishlist = await this.getWishlist();
    const filtered = wishlist.filter(item => item.id !== productId);
    await this.storage.set({ wishlist: filtered });
  }

  /**
   * 更新心愿单项目
   */
  async updateWishlistItem(productId, updates) {
    const wishlist = await this.getWishlist();
    const index = wishlist.findIndex(item => item.id === productId);

    if (index > -1) {
      wishlist[index] = { ...wishlist[index], ...updates };
      await this.storage.set({ wishlist });
    }
  }

  /**
   * 检查是否在心愿单
   */
  async isInWishlist(productId) {
    const wishlist = await this.getWishlist();
    return wishlist.some(item => item.id === productId);
  }

  // ==================== 提醒相关 ====================

  /**
   * 获取所有提醒
   */
  async getAlerts() {
    const result = await this.storage.get('alerts');
    return result.alerts || [];
  }

  /**
   * 添加提醒
   */
  async addAlert(alert) {
    const alerts = await this.getAlerts();

    // 检查是否已存在相同商品的提醒
    const exists = alerts.find(a => a.productId === alert.id);
    if (exists) {
      // 更新目标价格
      exists.targetPrice = alert.targetPrice;
      await this.storage.set({ alerts });
      return { success: true, message: '已更新提醒价格' };
    }

    const newAlert = {
      id: `alert_${Date.now()}`,
      productId: alert.id,
      title: alert.title,
      image: alert.image,
      url: alert.url,
      platform: alert.platform,
      currentPrice: alert.price,
      targetPrice: alert.targetPrice,
      createdAt: new Date().toISOString(),
      triggered: false
    };

    alerts.unshift(newAlert);
    await this.storage.set({ alerts });

    return { success: true, message: '提醒设置成功' };
  }

  /**
   * 移除提醒
   */
  async removeAlert(alertId) {
    const alerts = await this.getAlerts();
    const filtered = alerts.filter(a => a.id !== alertId);
    await this.storage.set({ alerts: filtered });
  }

  /**
   * 更新提醒
   */
  async updateAlert(alertId, updates) {
    const alerts = await this.getAlerts();
    const index = alerts.findIndex(a => a.id === alertId);

    if (index > -1) {
      alerts[index] = { ...alerts[index], ...updates };
      await this.storage.set({ alerts });
    }
  }

  // ==================== 价格历史相关 ====================

  /**
   * 获取价格历史
   */
  async getPriceHistory(productId) {
    const result = await this.storage.get('priceHistory');
    const history = result.priceHistory || {};
    return history[productId] || [];
  }

  /**
   * 添加价格记录
   */
  async addPriceHistory(productId, price) {
    const result = await this.storage.get('priceHistory');
    const history = result.priceHistory || {};

    if (!history[productId]) {
      history[productId] = [];
    }

    // 添加新记录
    history[productId].push({
      price,
      date: new Date().toISOString()
    });

    // 只保留最近90天的记录
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    history[productId] = history[productId].filter(
      record => new Date(record.date).getTime() > ninetyDaysAgo
    );

    await this.storage.set({ priceHistory: history });
  }

  /**
   * 获取价格统计
   */
  async getPriceStats(productId) {
    const history = await this.getPriceHistory(productId);

    if (history.length === 0) {
      return null;
    }

    const prices = history.map(h => h.price);

    return {
      lowest: Math.min(...prices),
      highest: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      current: prices[prices.length - 1],
      trend: this.calculateTrend(prices)
    };
  }

  /**
   * 计算价格趋势
   */
  calculateTrend(prices) {
    if (prices.length < 2) return 'stable';

    const recent = prices.slice(-7);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const current = prices[prices.length - 1];

    const change = (current - avg) / avg;

    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }

  // ==================== 统计相关 ====================

  /**
   * 获取统计数据
   */
  async getStatistics() {
    const result = await this.storage.get('statistics');
    return result.statistics || {
      totalSaved: 0,
      comparisons: 0,
      alertsTriggered: 0
    };
  }

  /**
   * 更新统计
   */
  async updateStatistics(updates) {
    const stats = await this.getStatistics();
    await this.storage.set({
      statistics: { ...stats, ...updates }
    });
  }

  /**
   * 增加比价次数
   */
  async incrementComparisons() {
    const stats = await this.getStatistics();
    stats.comparisons++;
    await this.storage.set({ statistics: stats });
  }

  /**
   * 添加节省金额
   */
  async addSavedAmount(amount) {
    const stats = await this.getStatistics();
    stats.totalSaved += amount;
    await this.storage.set({ statistics: stats });
  }

  // ==================== 通用方法 ====================

  /**
   * 清除所有数据
   */
  async clearAll() {
    await this.storage.clear();
  }

  /**
   * 导出数据
   */
  async exportData() {
    const data = await this.storage.get(null);
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入数据
   */
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      await this.storage.set(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
