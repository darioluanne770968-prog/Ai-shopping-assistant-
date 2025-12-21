/**
 * AI购物助手 - 智能补货提醒模块
 * 基于消费周期预测补货时机
 */

export class SmartReplenishment {
  constructor(storage) {
    this.storage = storage;

    // 常见消耗品类别及默认消耗周期（天）
    this.consumableCategories = {
      '纸巾': { defaultCycle: 30, unit: '包' },
      '洗衣液': { defaultCycle: 45, unit: '瓶' },
      '洗发水': { defaultCycle: 60, unit: '瓶' },
      '沐浴露': { defaultCycle: 45, unit: '瓶' },
      '牙膏': { defaultCycle: 30, unit: '支' },
      '洗洁精': { defaultCycle: 30, unit: '瓶' },
      '垃圾袋': { defaultCycle: 30, unit: '卷' },
      '保鲜膜': { defaultCycle: 45, unit: '卷' },
      '奶粉': { defaultCycle: 15, unit: '罐' },
      '纸尿裤': { defaultCycle: 7, unit: '包' },
      '猫粮': { defaultCycle: 30, unit: '袋' },
      '狗粮': { defaultCycle: 30, unit: '袋' },
      '咖啡': { defaultCycle: 14, unit: '袋' },
      '牛奶': { defaultCycle: 7, unit: '箱' },
      '维生素': { defaultCycle: 30, unit: '瓶' },
      '面膜': { defaultCycle: 15, unit: '盒' },
      '隐形眼镜': { defaultCycle: 30, unit: '盒' }
    };
  }

  /**
   * 添加消耗品追踪
   */
  async addConsumable(item) {
    const consumables = await this.getConsumables();

    const newItem = {
      id: `consumable_${Date.now()}`,
      name: item.name,
      category: this.detectCategory(item.name),
      brand: item.brand || '',
      purchaseDate: item.purchaseDate || new Date().toISOString(),
      quantity: item.quantity || 1,
      price: item.price,
      platform: item.platform,
      productUrl: item.productUrl,
      estimatedCycle: item.estimatedCycle || this.getDefaultCycle(item.name),
      actualCycles: [], // 实际消耗周期记录
      status: 'active',
      nextReminder: null
    };

    // 计算下次提醒时间
    newItem.nextReminder = this.calculateNextReminder(newItem);

    consumables.push(newItem);
    await this.saveConsumables(consumables);

    return newItem;
  }

  /**
   * 检测商品类别
   */
  detectCategory(name) {
    for (const [category, config] of Object.entries(this.consumableCategories)) {
      if (name.includes(category)) {
        return category;
      }
    }
    return '其他';
  }

  /**
   * 获取默认消耗周期
   */
  getDefaultCycle(name) {
    const category = this.detectCategory(name);
    return this.consumableCategories[category]?.defaultCycle || 30;
  }

  /**
   * 计算下次提醒时间
   */
  calculateNextReminder(item) {
    const purchaseDate = new Date(item.purchaseDate);
    const cycle = this.getOptimalCycle(item);

    // 提前3天提醒
    const reminderDate = new Date(purchaseDate.getTime() + (cycle - 3) * 24 * 60 * 60 * 1000);

    return reminderDate.toISOString();
  }

  /**
   * 获取最优消耗周期
   */
  getOptimalCycle(item) {
    // 如果有历史记录，使用平均值
    if (item.actualCycles && item.actualCycles.length >= 2) {
      const avg = item.actualCycles.reduce((a, b) => a + b, 0) / item.actualCycles.length;
      return Math.round(avg);
    }

    // 否则使用预设周期
    return item.estimatedCycle;
  }

  /**
   * 记录实际消耗
   */
  async recordConsumption(itemId, actualDays) {
    const consumables = await this.getConsumables();
    const item = consumables.find(c => c.id === itemId);

    if (!item) return { success: false, error: '未找到该商品' };

    // 记录实际消耗周期
    item.actualCycles.push(actualDays);

    // 只保留最近10次记录
    if (item.actualCycles.length > 10) {
      item.actualCycles = item.actualCycles.slice(-10);
    }

    // 更新下次提醒
    item.purchaseDate = new Date().toISOString();
    item.nextReminder = this.calculateNextReminder(item);

    await this.saveConsumables(consumables);

    return {
      success: true,
      newCycle: this.getOptimalCycle(item),
      nextReminder: item.nextReminder
    };
  }

  /**
   * 获取所有消耗品
   */
  async getConsumables() {
    const result = await this.storage.storage.get('consumables');
    return result.consumables || [];
  }

  /**
   * 保存消耗品列表
   */
  async saveConsumables(consumables) {
    await this.storage.storage.set({ consumables });
  }

  /**
   * 获取需要补货的商品
   */
  async getReplenishmentNeeded() {
    const consumables = await this.getConsumables();
    const now = new Date();

    const needsReplenishment = consumables.filter(item => {
      if (item.status !== 'active') return false;

      const reminderDate = new Date(item.nextReminder);
      return reminderDate <= now;
    });

    // 按紧急程度排序
    needsReplenishment.sort((a, b) => {
      const daysOverdueA = (now - new Date(a.nextReminder)) / (24 * 60 * 60 * 1000);
      const daysOverdueB = (now - new Date(b.nextReminder)) / (24 * 60 * 60 * 1000);
      return daysOverdueB - daysOverdueA;
    });

    return needsReplenishment.map(item => ({
      ...item,
      urgency: this.calculateUrgency(item),
      suggestedAction: this.getSuggestedAction(item)
    }));
  }

  /**
   * 计算紧急程度
   */
  calculateUrgency(item) {
    const now = new Date();
    const reminderDate = new Date(item.nextReminder);
    const daysOverdue = (now - reminderDate) / (24 * 60 * 60 * 1000);

    if (daysOverdue > 7) return { level: 'critical', label: '急需补货', color: '#ff4d4f' };
    if (daysOverdue > 3) return { level: 'high', label: '即将用完', color: '#faad14' };
    if (daysOverdue > 0) return { level: 'medium', label: '建议补货', color: '#1890ff' };
    return { level: 'low', label: '库存充足', color: '#52c41a' };
  }

  /**
   * 获取建议操作
   */
  getSuggestedAction(item) {
    const urgency = this.calculateUrgency(item);

    if (urgency.level === 'critical') {
      return {
        action: '立即购买',
        icon: '🚨',
        message: '库存可能已经用完，请立即补货'
      };
    }

    if (urgency.level === 'high') {
      return {
        action: '尽快购买',
        icon: '⚠️',
        message: '预计3天内用完，建议尽快补货'
      };
    }

    return {
      action: '加入购物车',
      icon: '🛒',
      message: '可以等待促销活动再购买'
    };
  }

  /**
   * 生成补货清单
   */
  async generateReplenishmentList() {
    const items = await this.getReplenishmentNeeded();

    if (items.length === 0) {
      return {
        hasItems: false,
        message: '太棒了！目前没有需要补货的商品'
      };
    }

    // 按平台分组
    const byPlatform = {};
    items.forEach(item => {
      const platform = item.platform || '未知';
      if (!byPlatform[platform]) {
        byPlatform[platform] = [];
      }
      byPlatform[platform].push(item);
    });

    // 计算总预算
    const totalBudget = items.reduce((sum, item) => sum + item.price, 0);

    return {
      hasItems: true,
      items,
      byPlatform,
      totalBudget,
      summary: `共${items.length}件商品需要补货，预计花费¥${totalBudget.toFixed(0)}`
    };
  }

  /**
   * 智能推荐购买时机
   */
  async recommendPurchaseTime(item) {
    // 结合大促日历和消耗周期
    const cycle = this.getOptimalCycle(item);
    const daysLeft = this.getDaysUntilEmpty(item);

    const recommendations = [];

    // 如果还有库存，检查是否可以等到大促
    if (daysLeft > 7) {
      const upcomingSales = await this.getUpcomingSales();

      for (const sale of upcomingSales) {
        if (sale.daysUntil < daysLeft - 3) {
          recommendations.push({
            type: 'wait_for_sale',
            icon: '🎉',
            title: `等待${sale.name}`,
            description: `${sale.daysUntil}天后有大促，预计可省${sale.discount}`,
            date: sale.date
          });
        }
      }
    }

    // 检查是否有订阅优惠
    recommendations.push({
      type: 'subscribe',
      icon: '🔄',
      title: '开通定期购',
      description: '部分平台定期购有额外折扣'
    });

    // 如果紧急，建议立即购买
    if (daysLeft <= 3) {
      recommendations.unshift({
        type: 'buy_now',
        icon: '⚡',
        title: '立即购买',
        description: '库存即将用完，不建议等待'
      });
    }

    return recommendations;
  }

  /**
   * 获取距离用完的天数
   */
  getDaysUntilEmpty(item) {
    const now = new Date();
    const purchaseDate = new Date(item.purchaseDate);
    const daysSincePurchase = (now - purchaseDate) / (24 * 60 * 60 * 1000);
    const cycle = this.getOptimalCycle(item);

    return Math.max(0, cycle - daysSincePurchase);
  }

  /**
   * 获取即将到来的促销
   */
  async getUpcomingSales() {
    // 简化实现
    return [
      { name: '618', daysUntil: 30, discount: '20%', date: '6月18日' },
      { name: '双11', daysUntil: 150, discount: '30%', date: '11月11日' }
    ];
  }

  /**
   * 生成消耗品报告
   */
  async generateConsumptionReport(months = 3) {
    const consumables = await this.getConsumables();

    const report = {
      period: `近${months}个月`,
      totalItems: consumables.length,
      categories: {},
      insights: [],
      totalSpent: 0
    };

    // 分类统计
    consumables.forEach(item => {
      const category = item.category;
      if (!report.categories[category]) {
        report.categories[category] = {
          count: 0,
          totalSpent: 0,
          items: []
        };
      }

      report.categories[category].count++;
      report.categories[category].totalSpent += item.price;
      report.categories[category].items.push(item);
      report.totalSpent += item.price;
    });

    // 生成洞察
    const topCategory = Object.entries(report.categories)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)[0];

    if (topCategory) {
      report.insights.push({
        icon: '📊',
        text: `${topCategory[0]}类消耗最多，共花费¥${topCategory[1].totalSpent.toFixed(0)}`
      });
    }

    return report;
  }

  /**
   * 暂停/恢复追踪
   */
  async toggleTracking(itemId, active) {
    const consumables = await this.getConsumables();
    const item = consumables.find(c => c.id === itemId);

    if (item) {
      item.status = active ? 'active' : 'paused';
      await this.saveConsumables(consumables);
      return { success: true };
    }

    return { success: false };
  }

  /**
   * 删除追踪项
   */
  async removeConsumable(itemId) {
    const consumables = await this.getConsumables();
    const filtered = consumables.filter(c => c.id !== itemId);
    await this.saveConsumables(filtered);
    return { success: true };
  }
}
