/**
 * AI购物助手 - 提醒管理模块
 */

import { StorageManager } from './storage.js';

export class AlertManager {
  constructor() {
    this.storage = new StorageManager();
  }

  /**
   * 获取所有提醒
   */
  async getAll() {
    return await this.storage.getAlerts();
  }

  /**
   * 添加提醒
   */
  async add(alertData) {
    return await this.storage.addAlert(alertData);
  }

  /**
   * 移除提醒
   */
  async remove(alertId) {
    await this.storage.removeAlert(alertId);
  }

  /**
   * 更新提醒
   */
  async update(alertId, updates) {
    await this.storage.updateAlert(alertId, updates);
  }

  /**
   * 获取活跃提醒（未触发的）
   */
  async getActive() {
    const alerts = await this.getAll();
    return alerts.filter(alert => !alert.triggered);
  }

  /**
   * 获取已触发的提醒
   */
  async getTriggered() {
    const alerts = await this.getAll();
    return alerts.filter(alert => alert.triggered);
  }

  /**
   * 检查价格是否达到目标
   */
  async checkPriceTarget(productId, currentPrice) {
    const alerts = await this.getAll();
    const alert = alerts.find(a => a.productId === productId && !a.triggered);

    if (alert && currentPrice <= alert.targetPrice) {
      return {
        triggered: true,
        alert,
        currentPrice,
        savedAmount: alert.currentPrice - currentPrice
      };
    }

    return { triggered: false };
  }

  /**
   * 标记提醒为已触发
   */
  async markAsTriggered(alertId, triggeredPrice) {
    await this.update(alertId, {
      triggered: true,
      triggeredPrice,
      triggeredAt: new Date().toISOString()
    });
  }

  /**
   * 重置提醒
   */
  async reset(alertId) {
    await this.update(alertId, {
      triggered: false,
      triggeredPrice: null,
      triggeredAt: null
    });
  }

  /**
   * 获取提醒统计
   */
  async getStats() {
    const alerts = await this.getAll();

    return {
      total: alerts.length,
      active: alerts.filter(a => !a.triggered).length,
      triggered: alerts.filter(a => a.triggered).length,
      potentialSavings: alerts
        .filter(a => !a.triggered)
        .reduce((sum, a) => sum + (a.currentPrice - a.targetPrice), 0)
    };
  }

  /**
   * 清除已触发的提醒
   */
  async clearTriggered() {
    const alerts = await this.getAll();
    const active = alerts.filter(a => !a.triggered);
    await this.storage.storage.set({ alerts: active });
  }

  /**
   * 清除所有提醒
   */
  async clearAll() {
    await this.storage.storage.set({ alerts: [] });
  }

  /**
   * 按平台分组提醒
   */
  async groupByPlatform() {
    const alerts = await this.getAll();
    const groups = {};

    alerts.forEach(alert => {
      const platform = alert.platform || '其他';
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(alert);
    });

    return groups;
  }

  /**
   * 获取即将到期的提醒（价格接近目标）
   */
  async getCloseToTarget(threshold = 0.1) {
    const alerts = await this.getActive();

    return alerts.filter(alert => {
      const diff = (alert.currentPrice - alert.targetPrice) / alert.currentPrice;
      return diff <= threshold;
    });
  }
}
