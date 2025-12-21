/**
 * AI购物助手 - 砍价联盟模块
 * 组队砍价、拼团优化、社交裂变购物
 */

export class GroupBargaining {
  constructor() {
    this.activeGroups = new Map();
    this.userProfile = null;

    // 拼团类型
    this.groupTypes = {
      standard: {
        name: '普通拼团',
        icon: '👥',
        minMembers: 2,
        maxMembers: 10,
        discountRange: [5, 20]
      },
      ladder: {
        name: '阶梯拼团',
        icon: '📈',
        minMembers: 3,
        maxMembers: 50,
        discountRange: [10, 50],
        tiers: [
          { members: 3, discount: 10 },
          { members: 10, discount: 20 },
          { members: 20, discount: 35 },
          { members: 50, discount: 50 }
        ]
      },
      flash: {
        name: '限时拼团',
        icon: '⚡',
        minMembers: 2,
        maxMembers: 100,
        timeLimit: 3600, // 1小时
        discountRange: [15, 40]
      },
      bargain: {
        name: '砍价助力',
        icon: '🔪',
        minHelpers: 10,
        maxHelpers: 100,
        priceReductionPerHelper: 0.5 // 每人砍0.5%
      },
      wholesale: {
        name: '团购批发',
        icon: '📦',
        minQuantity: 50,
        maxQuantity: 1000,
        discountRange: [20, 60]
      }
    };

    // 社交裂变策略
    this.viralStrategies = {
      shareReward: {
        name: '分享返利',
        rewardType: 'cashback',
        rewardPercent: 5
      },
      inviteBonus: {
        name: '邀请奖励',
        rewardType: 'points',
        rewardAmount: 100
      },
      chainDiscount: {
        name: '链式折扣',
        discountDecay: 0.9 // 每层递减10%
      }
    };
  }

  /**
   * 创建拼团
   */
  async createGroup(product, type = 'standard', options = {}) {
    const groupConfig = this.groupTypes[type];
    if (!groupConfig) {
      throw new Error(`不支持的拼团类型: ${type}`);
    }

    const group = {
      id: this.generateGroupId(),
      type,
      product: {
        id: product.id,
        title: product.title,
        originalPrice: product.price,
        image: product.image,
        platform: product.platform
      },
      creator: await this.getCurrentUser(),
      members: [],
      targetMembers: options.targetMembers || groupConfig.minMembers,
      currentDiscount: 0,
      status: 'recruiting',
      createdAt: new Date().toISOString(),
      expiresAt: this.calculateExpiry(type, options),
      shareLink: null,
      qrCode: null
    };

    // 创建者自动加入
    await this.joinGroup(group.id, group.creator);

    // 生成分享链接
    group.shareLink = this.generateShareLink(group.id);
    group.qrCode = await this.generateQRCode(group.shareLink);

    // 保存拼团信息
    this.activeGroups.set(group.id, group);
    await this.saveGroup(group);

    return {
      success: true,
      group,
      message: `拼团创建成功！再邀请${group.targetMembers - 1}人即可成团`
    };
  }

  /**
   * 加入拼团
   */
  async joinGroup(groupId, user) {
    const group = this.activeGroups.get(groupId) || await this.loadGroup(groupId);

    if (!group) {
      return { success: false, error: '拼团不存在' };
    }

    if (group.status !== 'recruiting') {
      return { success: false, error: '拼团已结束' };
    }

    if (new Date(group.expiresAt) < new Date()) {
      group.status = 'expired';
      return { success: false, error: '拼团已过期' };
    }

    // 检查是否已加入
    if (group.members.some(m => m.id === user.id)) {
      return { success: false, error: '您已加入该拼团' };
    }

    const groupConfig = this.groupTypes[group.type];
    if (group.members.length >= groupConfig.maxMembers) {
      return { success: false, error: '拼团人数已满' };
    }

    // 添加成员
    group.members.push({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      joinedAt: new Date().toISOString()
    });

    // 更新折扣
    group.currentDiscount = this.calculateDiscount(group);

    // 检查是否成团
    if (group.members.length >= group.targetMembers) {
      group.status = 'success';
      await this.notifyGroupSuccess(group);
    }

    await this.saveGroup(group);

    return {
      success: true,
      group,
      message: group.status === 'success'
        ? '🎉 拼团成功！'
        : `还差${group.targetMembers - group.members.length}人成团`
    };
  }

  /**
   * 计算当前折扣
   */
  calculateDiscount(group) {
    const config = this.groupTypes[group.type];
    const memberCount = group.members.length;

    switch (group.type) {
      case 'ladder':
        // 阶梯折扣
        let discount = 0;
        for (const tier of config.tiers) {
          if (memberCount >= tier.members) {
            discount = tier.discount;
          }
        }
        return discount;

      case 'bargain':
        // 砍价模式
        return Math.min(memberCount * config.priceReductionPerHelper, 99);

      case 'flash':
        // 限时拼团 - 人越多折扣越大
        const ratio = memberCount / config.maxMembers;
        const [min, max] = config.discountRange;
        return min + (max - min) * ratio;

      default:
        // 标准拼团
        if (memberCount >= config.minMembers) {
          return config.discountRange[0];
        }
        return 0;
    }
  }

  /**
   * 发起砍价
   */
  async startBargain(product, targetPrice) {
    const originalPrice = product.price;
    const maxReduction = originalPrice - targetPrice;
    const helpersNeeded = Math.ceil(maxReduction / (originalPrice * 0.005));

    const bargain = {
      id: this.generateGroupId(),
      type: 'bargain',
      product: {
        id: product.id,
        title: product.title,
        originalPrice,
        targetPrice,
        currentPrice: originalPrice,
        image: product.image
      },
      creator: await this.getCurrentUser(),
      helpers: [],
      helpersNeeded,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    bargain.shareLink = this.generateShareLink(bargain.id, 'bargain');

    this.activeGroups.set(bargain.id, bargain);
    await this.saveGroup(bargain);

    return {
      success: true,
      bargain,
      message: `砍价开始！邀请${helpersNeeded}位好友帮砍可达到目标价格`
    };
  }

  /**
   * 帮忙砍价
   */
  async helpBargain(bargainId, helper) {
    const bargain = this.activeGroups.get(bargainId) || await this.loadGroup(bargainId);

    if (!bargain || bargain.type !== 'bargain') {
      return { success: false, error: '砍价活动不存在' };
    }

    if (bargain.helpers.some(h => h.id === helper.id)) {
      return { success: false, error: '您已帮砍过了' };
    }

    // 计算砍掉的金额（随机波动）
    const baseReduction = bargain.product.originalPrice * 0.005;
    const randomFactor = 0.5 + Math.random();
    const reduction = baseReduction * randomFactor;

    bargain.helpers.push({
      id: helper.id,
      name: helper.name,
      reduction,
      helpedAt: new Date().toISOString()
    });

    bargain.product.currentPrice = Math.max(
      bargain.product.targetPrice,
      bargain.product.currentPrice - reduction
    );

    // 检查是否达到目标
    if (bargain.product.currentPrice <= bargain.product.targetPrice) {
      bargain.status = 'success';
      bargain.product.currentPrice = bargain.product.targetPrice;
    }

    await this.saveGroup(bargain);

    return {
      success: true,
      reduction: reduction.toFixed(2),
      currentPrice: bargain.product.currentPrice.toFixed(2),
      remaining: (bargain.product.currentPrice - bargain.product.targetPrice).toFixed(2),
      message: bargain.status === 'success'
        ? '🎉 砍价成功！已达到目标价格'
        : `成功砍掉 ¥${reduction.toFixed(2)}`
    };
  }

  /**
   * 查找可加入的拼团
   */
  async findAvailableGroups(product) {
    const allGroups = await this.loadAllGroups();

    return allGroups.filter(group => {
      // 匹配同一商品
      if (group.product.id !== product.id) return false;
      // 正在招募中
      if (group.status !== 'recruiting') return false;
      // 未过期
      if (new Date(group.expiresAt) < new Date()) return false;
      // 未满员
      const config = this.groupTypes[group.type];
      if (group.members.length >= config.maxMembers) return false;

      return true;
    }).map(group => ({
      ...group,
      discount: this.calculateDiscount(group),
      spotsLeft: this.groupTypes[group.type].maxMembers - group.members.length,
      timeLeft: this.formatTimeLeft(group.expiresAt)
    }));
  }

  /**
   * 智能匹配拼团
   */
  async smartMatch(product, userPreferences = {}) {
    const availableGroups = await this.findAvailableGroups(product);

    // 没有现成拼团，推荐创建
    if (availableGroups.length === 0) {
      return {
        recommendation: 'create',
        suggestedType: this.suggestGroupType(product, userPreferences),
        message: '暂无可加入的拼团，建议发起新拼团'
      };
    }

    // 评分并排序
    const scoredGroups = availableGroups.map(group => ({
      ...group,
      score: this.calculateGroupScore(group, userPreferences)
    })).sort((a, b) => b.score - a.score);

    return {
      recommendation: 'join',
      bestMatch: scoredGroups[0],
      alternatives: scoredGroups.slice(1, 5),
      message: `找到${availableGroups.length}个可加入的拼团`
    };
  }

  /**
   * 计算拼团评分
   */
  calculateGroupScore(group, preferences) {
    let score = 0;

    // 折扣力度 (40%)
    score += group.discount * 0.4;

    // 成团速度预测 (30%)
    const fillRate = group.members.length / group.targetMembers;
    const timeElapsed = (Date.now() - new Date(group.createdAt)) / 1000;
    const estimatedTimeToFill = timeElapsed / fillRate;
    const timeLeft = (new Date(group.expiresAt) - Date.now()) / 1000;

    if (estimatedTimeToFill < timeLeft * 0.5) {
      score += 30; // 很可能成团
    } else if (estimatedTimeToFill < timeLeft) {
      score += 20;
    } else {
      score += 10;
    }

    // 剩余名额 (15%)
    if (group.spotsLeft > 0 && group.spotsLeft < 5) {
      score += 15; // 即将满员，紧迫感
    } else {
      score += 10;
    }

    // 用户偏好匹配 (15%)
    if (preferences.preferredType === group.type) {
      score += 15;
    }

    return score;
  }

  /**
   * 推荐拼团类型
   */
  suggestGroupType(product, preferences) {
    const price = product.price;

    if (price > 1000) {
      return 'ladder'; // 高价商品用阶梯拼团
    } else if (preferences.urgent) {
      return 'flash'; // 急需用限时拼团
    } else if (price < 50) {
      return 'wholesale'; // 低价商品用团购批发
    } else {
      return 'standard';
    }
  }

  /**
   * 获取拼团统计
   */
  async getGroupStats() {
    const groups = await this.loadAllGroups();

    const stats = {
      totalGroups: groups.length,
      successfulGroups: groups.filter(g => g.status === 'success').length,
      totalSaved: 0,
      averageDiscount: 0,
      popularProducts: {},
      activeGroups: groups.filter(g => g.status === 'recruiting').length
    };

    groups.forEach(group => {
      if (group.status === 'success') {
        const saved = group.product.originalPrice * (group.currentDiscount / 100) * group.members.length;
        stats.totalSaved += saved;
      }

      const productId = group.product.id;
      stats.popularProducts[productId] = (stats.popularProducts[productId] || 0) + 1;
    });

    if (stats.successfulGroups > 0) {
      stats.averageDiscount = groups
        .filter(g => g.status === 'success')
        .reduce((sum, g) => sum + g.currentDiscount, 0) / stats.successfulGroups;
    }

    return stats;
  }

  /**
   * 生成分享链接
   */
  generateShareLink(groupId, type = 'group') {
    const baseUrl = 'https://ai-shopping.helper/share';
    return `${baseUrl}/${type}/${groupId}`;
  }

  /**
   * 生成二维码
   */
  async generateQRCode(content) {
    // 简化实现 - 实际使用 qrcode.js 库
    return {
      dataUrl: `data:image/svg+xml;base64,${btoa(`<svg></svg>`)}`,
      content
    };
  }

  /**
   * 生成拼团ID
   */
  generateGroupId() {
    return `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算过期时间
   */
  calculateExpiry(type, options) {
    const config = this.groupTypes[type];
    const duration = options.duration || config.timeLimit || 24 * 60 * 60; // 默认24小时
    return new Date(Date.now() + duration * 1000).toISOString();
  }

  /**
   * 格式化剩余时间
   */
  formatTimeLeft(expiresAt) {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return '已过期';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)}天`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser() {
    if (this.userProfile) return this.userProfile;

    // 从存储获取
    return new Promise(resolve => {
      chrome.storage.local.get(['userProfile'], result => {
        this.userProfile = result.userProfile || {
          id: `user_${Date.now()}`,
          name: '匿名用户',
          avatar: null
        };
        resolve(this.userProfile);
      });
    });
  }

  /**
   * 保存拼团
   */
  async saveGroup(group) {
    return new Promise(resolve => {
      chrome.storage.local.get(['groups'], result => {
        const groups = result.groups || {};
        groups[group.id] = group;
        chrome.storage.local.set({ groups }, resolve);
      });
    });
  }

  /**
   * 加载拼团
   */
  async loadGroup(groupId) {
    return new Promise(resolve => {
      chrome.storage.local.get(['groups'], result => {
        const groups = result.groups || {};
        resolve(groups[groupId] || null);
      });
    });
  }

  /**
   * 加载所有拼团
   */
  async loadAllGroups() {
    return new Promise(resolve => {
      chrome.storage.local.get(['groups'], result => {
        resolve(Object.values(result.groups || {}));
      });
    });
  }

  /**
   * 通知成团成功
   */
  async notifyGroupSuccess(group) {
    // 发送通知给所有成员
    chrome.notifications.create(`group_success_${group.id}`, {
      type: 'basic',
      iconUrl: '/assets/icons/icon128.png',
      title: '🎉 拼团成功！',
      message: `${group.product.title} 已成团，享${group.currentDiscount}%折扣`,
      priority: 2
    });
  }
}
