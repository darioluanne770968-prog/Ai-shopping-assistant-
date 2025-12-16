/**
 * AI购物助手 - 心愿单管理模块
 */

import { StorageManager } from './storage.js';

export class WishlistManager {
  constructor() {
    this.storage = new StorageManager();
  }

  /**
   * 获取所有心愿单项目
   */
  async getAll() {
    return await this.storage.getWishlist();
  }

  /**
   * 添加商品到心愿单
   */
  async add(product) {
    return await this.storage.addToWishlist(product);
  }

  /**
   * 从心愿单移除商品
   */
  async remove(productId) {
    await this.storage.removeFromWishlist(productId);
  }

  /**
   * 更新心愿单项目
   */
  async update(productId, updates) {
    await this.storage.updateWishlistItem(productId, updates);
  }

  /**
   * 检查商品是否在心愿单中
   */
  async isInList(productId) {
    return await this.storage.isInWishlist(productId);
  }

  /**
   * 获取心愿单数量
   */
  async getCount() {
    const list = await this.getAll();
    return list.length;
  }

  /**
   * 获取降价商品
   */
  async getPriceDropItems() {
    const list = await this.getAll();
    return list.filter(item =>
      item.currentPrice < item.originalPrice
    );
  }

  /**
   * 计算总节省金额
   */
  async getTotalSaved() {
    const list = await this.getAll();
    return list.reduce((total, item) => {
      if (item.currentPrice < item.originalPrice) {
        return total + (item.originalPrice - item.currentPrice);
      }
      return total;
    }, 0);
  }

  /**
   * 按平台分组
   */
  async groupByPlatform() {
    const list = await this.getAll();
    const groups = {};

    list.forEach(item => {
      const platform = item.platform || '其他';
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(item);
    });

    return groups;
  }

  /**
   * 排序心愿单
   */
  async sort(sortBy = 'addedAt', order = 'desc') {
    const list = await this.getAll();

    list.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'price':
          valueA = a.currentPrice;
          valueB = b.currentPrice;
          break;
        case 'priceChange':
          valueA = a.priceChange || 0;
          valueB = b.priceChange || 0;
          break;
        case 'addedAt':
        default:
          valueA = new Date(a.addedAt).getTime();
          valueB = new Date(b.addedAt).getTime();
      }

      return order === 'desc' ? valueB - valueA : valueA - valueB;
    });

    return list;
  }

  /**
   * 搜索心愿单
   */
  async search(keyword) {
    const list = await this.getAll();
    const lowerKeyword = keyword.toLowerCase();

    return list.filter(item =>
      item.title.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 清空心愿单
   */
  async clear() {
    await this.storage.storage.set({ wishlist: [] });
  }

  /**
   * 批量更新价格
   */
  async updatePrices(priceUpdates) {
    const list = await this.getAll();

    list.forEach(item => {
      if (priceUpdates[item.id]) {
        const newPrice = priceUpdates[item.id];
        item.previousPrice = item.currentPrice;
        item.currentPrice = newPrice;
        item.priceChange = ((newPrice - item.originalPrice) / item.originalPrice * 100).toFixed(1);
        item.lastUpdated = new Date().toISOString();
      }
    });

    await this.storage.storage.set({ wishlist: list });
  }
}
