/**
 * AI购物助手 - 智能预算管理模块
 * 设置预算、追踪支出、消费分析
 */

export class BudgetManager {
  constructor(storage) {
    this.storage = storage;
    this.categories = [
      '数码电子', '服装鞋帽', '美妆护肤', '食品生鲜',
      '家居家装', '母婴用品', '运动户外', '图书文具', '其他'
    ];
  }

  /**
   * 设置月度预算
   */
  async setBudget(amount, month = null) {
    const targetMonth = month || this.getCurrentMonth();

    const budgets = await this.getBudgets();
    budgets[targetMonth] = {
      total: amount,
      spent: budgets[targetMonth]?.spent || 0,
      categories: budgets[targetMonth]?.categories || {},
      createdAt: new Date().toISOString()
    };

    await this.storage.storage.set({ budgets });

    return budgets[targetMonth];
  }

  /**
   * 设置分类预算
   */
  async setCategoryBudget(category, amount, month = null) {
    const targetMonth = month || this.getCurrentMonth();
    const budgets = await this.getBudgets();

    if (!budgets[targetMonth]) {
      budgets[targetMonth] = { total: 0, spent: 0, categories: {} };
    }

    budgets[targetMonth].categories[category] = {
      budget: amount,
      spent: budgets[targetMonth].categories[category]?.spent || 0
    };

    await this.storage.storage.set({ budgets });
  }

  /**
   * 记录支出
   */
  async recordExpense(expense) {
    const {
      amount,
      category = '其他',
      productName,
      platform,
      productUrl,
      date = new Date().toISOString()
    } = expense;

    const month = date.substring(0, 7);
    const budgets = await this.getBudgets();

    if (!budgets[month]) {
      budgets[month] = { total: 0, spent: 0, categories: {} };
    }

    // 更新总支出
    budgets[month].spent += amount;

    // 更新分类支出
    if (!budgets[month].categories[category]) {
      budgets[month].categories[category] = { budget: 0, spent: 0 };
    }
    budgets[month].categories[category].spent += amount;

    await this.storage.storage.set({ budgets });

    // 记录消费历史
    await this.addExpenseRecord({
      amount,
      category,
      productName,
      platform,
      productUrl,
      date
    });

    // 检查预算警告
    const warning = await this.checkBudgetWarning(month);

    return { success: true, warning };
  }

  /**
   * 添加消费记录
   */
  async addExpenseRecord(record) {
    const result = await this.storage.storage.get('expenseHistory');
    const history = result.expenseHistory || [];

    history.unshift({
      id: `exp_${Date.now()}`,
      ...record
    });

    // 只保留最近1年的记录
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const filtered = history.filter(h =>
      new Date(h.date) > oneYearAgo
    );

    await this.storage.storage.set({ expenseHistory: filtered });
  }

  /**
   * 获取预算数据
   */
  async getBudgets() {
    const result = await this.storage.storage.get('budgets');
    return result.budgets || {};
  }

  /**
   * 获取当月预算状态
   */
  async getCurrentBudgetStatus() {
    const month = this.getCurrentMonth();
    const budgets = await this.getBudgets();
    const budget = budgets[month];

    if (!budget || budget.total === 0) {
      return {
        hasBudget: false,
        message: '本月未设置预算'
      };
    }

    const remaining = budget.total - budget.spent;
    const percentage = (budget.spent / budget.total) * 100;
    const daysLeft = this.getDaysLeftInMonth();
    const dailyBudget = remaining / daysLeft;

    let status, message, color;

    if (percentage >= 100) {
      status = 'exceeded';
      message = `已超支 ¥${Math.abs(remaining).toFixed(0)}`;
      color = '#ff4d4f';
    } else if (percentage >= 80) {
      status = 'warning';
      message = `预算紧张，剩余 ¥${remaining.toFixed(0)}`;
      color = '#faad14';
    } else if (percentage >= 50) {
      status = 'moderate';
      message = `已用${percentage.toFixed(0)}%，剩余 ¥${remaining.toFixed(0)}`;
      color = '#1890ff';
    } else {
      status = 'healthy';
      message = `预算充足，剩余 ¥${remaining.toFixed(0)}`;
      color = '#52c41a';
    }

    return {
      hasBudget: true,
      month,
      total: budget.total,
      spent: budget.spent,
      remaining,
      percentage,
      daysLeft,
      dailyBudget,
      status,
      message,
      color,
      categories: budget.categories
    };
  }

  /**
   * 检查预算警告
   */
  async checkBudgetWarning(month) {
    const budgets = await this.getBudgets();
    const budget = budgets[month];

    if (!budget || budget.total === 0) return null;

    const percentage = (budget.spent / budget.total) * 100;

    if (percentage >= 100) {
      return {
        type: 'exceeded',
        title: '预算已超支',
        message: `本月预算¥${budget.total}已用完，超支¥${(budget.spent - budget.total).toFixed(0)}`,
        severity: 'high'
      };
    }

    if (percentage >= 90) {
      return {
        type: 'critical',
        title: '预算即将用尽',
        message: `本月预算已用${percentage.toFixed(0)}%，仅剩¥${(budget.total - budget.spent).toFixed(0)}`,
        severity: 'high'
      };
    }

    if (percentage >= 75) {
      return {
        type: 'warning',
        title: '预算提醒',
        message: `本月预算已用${percentage.toFixed(0)}%，请注意控制支出`,
        severity: 'medium'
      };
    }

    return null;
  }

  /**
   * 购买前预算检查
   */
  async checkBeforePurchase(amount, category = '其他') {
    const status = await this.getCurrentBudgetStatus();

    if (!status.hasBudget) {
      return {
        allowed: true,
        message: '未设置预算限制'
      };
    }

    const newSpent = status.spent + amount;
    const newPercentage = (newSpent / status.total) * 100;

    if (newSpent > status.total) {
      return {
        allowed: false,
        warning: true,
        message: `购买后将超支 ¥${(newSpent - status.total).toFixed(0)}`,
        suggestion: `本月剩余预算 ¥${status.remaining.toFixed(0)}，此商品 ¥${amount}`
      };
    }

    if (newPercentage >= 90) {
      return {
        allowed: true,
        warning: true,
        message: '购买后预算将非常紧张',
        suggestion: `剩余预算将只有 ¥${(status.total - newSpent).toFixed(0)}`
      };
    }

    return {
      allowed: true,
      warning: false,
      message: `购买后剩余预算 ¥${(status.remaining - amount).toFixed(0)}`
    };
  }

  /**
   * 获取消费分析报告
   */
  async getSpendingAnalysis(months = 3) {
    const result = await this.storage.storage.get('expenseHistory');
    const history = result.expenseHistory || [];

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const filteredHistory = history.filter(h => new Date(h.date) >= startDate);

    // 按月统计
    const monthlySpending = {};
    const categorySpending = {};
    const platformSpending = {};

    filteredHistory.forEach(expense => {
      const month = expense.date.substring(0, 7);

      // 月度统计
      monthlySpending[month] = (monthlySpending[month] || 0) + expense.amount;

      // 分类统计
      const category = expense.category || '其他';
      categorySpending[category] = (categorySpending[category] || 0) + expense.amount;

      // 平台统计
      const platform = expense.platform || '未知';
      platformSpending[platform] = (platformSpending[platform] || 0) + expense.amount;
    });

    const totalSpending = Object.values(monthlySpending).reduce((a, b) => a + b, 0);
    const avgMonthly = totalSpending / months;

    // 找出消费最多的分类
    const topCategory = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])[0];

    // 找出消费最多的平台
    const topPlatform = Object.entries(platformSpending)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      period: `近${months}个月`,
      totalSpending,
      avgMonthly,
      monthlySpending,
      categorySpending,
      platformSpending,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      topPlatform: topPlatform ? { name: topPlatform[0], amount: topPlatform[1] } : null,
      transactionCount: filteredHistory.length,
      insights: this.generateInsights(monthlySpending, categorySpending, avgMonthly)
    };
  }

  /**
   * 生成消费洞察
   */
  generateInsights(monthlySpending, categorySpending, avgMonthly) {
    const insights = [];

    // 月度趋势
    const months = Object.keys(monthlySpending).sort();
    if (months.length >= 2) {
      const lastMonth = monthlySpending[months[months.length - 1]];
      const prevMonth = monthlySpending[months[months.length - 2]];
      const change = ((lastMonth - prevMonth) / prevMonth) * 100;

      if (change > 20) {
        insights.push({
          type: 'warning',
          icon: '📈',
          text: `上月消费较前月增长${change.toFixed(0)}%，注意控制`
        });
      } else if (change < -20) {
        insights.push({
          type: 'positive',
          icon: '📉',
          text: `上月消费较前月减少${Math.abs(change).toFixed(0)}%，继续保持`
        });
      }
    }

    // 分类分析
    const categories = Object.entries(categorySpending);
    const total = categories.reduce((sum, [_, amount]) => sum + amount, 0);

    categories.forEach(([category, amount]) => {
      const percentage = (amount / total) * 100;
      if (percentage > 40) {
        insights.push({
          type: 'info',
          icon: '🎯',
          text: `${category}类消费占比${percentage.toFixed(0)}%，考虑是否需要控制`
        });
      }
    });

    // 平均消费建议
    if (avgMonthly > 3000) {
      insights.push({
        type: 'tip',
        icon: '💡',
        text: `月均消费¥${avgMonthly.toFixed(0)}，建议设置预算进行控制`
      });
    }

    return insights;
  }

  /**
   * 获取省钱建议
   */
  async getSavingTips() {
    const analysis = await this.getSpendingAnalysis(3);
    const tips = [];

    // 基于消费分析生成建议
    if (analysis.topCategory) {
      tips.push({
        icon: '💰',
        title: '关注重点品类',
        text: `${analysis.topCategory.name}是你的主要消费，可以重点关注该品类的优惠活动`
      });
    }

    if (analysis.topPlatform) {
      tips.push({
        icon: '🏪',
        title: '平台会员',
        text: `你常在${analysis.topPlatform.name}购物，考虑开通会员获得更多优惠`
      });
    }

    tips.push({
      icon: '⏰',
      title: '等待大促',
      text: '非急需商品可以等待618、双11等大促节点购买'
    });

    tips.push({
      icon: '📊',
      title: '比价习惯',
      text: '购买前使用比价功能，通常可以找到更低价格'
    });

    tips.push({
      icon: '🎫',
      title: '领券购买',
      text: '下单前记得搜索可用优惠券，积少成多'
    });

    return tips;
  }

  /**
   * 获取当前月份
   */
  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 获取本月剩余天数
   */
  getDaysLeftInMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate() + 1;
  }
}
