/**
 * AI购物助手 - Popup主脚本
 */

import { PriceComparison } from '../modules/price-comparison.js';
import { AIAnalyzer } from '../modules/ai-analyzer.js';
import { WishlistManager } from '../modules/wishlist.js';
import { AlertManager } from '../modules/alerts.js';
import { StorageManager } from '../modules/storage.js';
import { ChartManager } from '../modules/chart.js';

class PopupApp {
  constructor() {
    this.currentProduct = null;
    this.priceComparison = new PriceComparison();
    this.aiAnalyzer = new AIAnalyzer();
    this.wishlistManager = new WishlistManager();
    this.alertManager = new AlertManager();
    this.storageManager = new StorageManager();
    this.chartManager = new ChartManager();

    this.init();
  }

  async init() {
    this.bindEvents();
    this.initTabs();
    await this.loadCurrentProduct();
    await this.loadWishlist();
    await this.loadAlerts();
  }

  // 事件绑定
  bindEvents() {
    // 标签切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // 底部操作按钮
    document.getElementById('addToWishlistBtn').addEventListener('click', () => {
      this.addToWishlist();
    });

    document.getElementById('setAlertBtn').addEventListener('click', () => {
      this.showAlertModal();
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
      this.shareProduct();
    });

    document.getElementById('compareBtn').addEventListener('click', () => {
      this.refreshComparison();
    });

    // 以图搜商品
    document.getElementById('imageSearchBtn').addEventListener('click', () => {
      document.getElementById('imageInput').click();
    });

    document.getElementById('imageInput').addEventListener('change', (e) => {
      this.handleImageSearch(e.target.files[0]);
    });

    // 提醒弹窗
    document.getElementById('addAlertBtn').addEventListener('click', () => {
      this.showAlertModal();
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
      this.hideAlertModal();
    });

    document.getElementById('cancelAlertBtn').addEventListener('click', () => {
      this.hideAlertModal();
    });

    document.getElementById('saveAlertBtn').addEventListener('click', () => {
      this.saveAlert();
    });
  }

  // 标签初始化
  initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
      });
    });
  }

  // 切换标签
  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-panel`).classList.add('active');
  }

  // 加载当前商品
  async loadCurrentProduct() {
    try {
      // 从当前标签页获取商品信息
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) return;

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' });

      if (response && response.product) {
        this.currentProduct = response.product;
        this.renderCurrentProduct();
        await this.loadPriceComparison();
        await this.loadAIAnalysis();
      } else {
        this.renderNoProduct();
      }
    } catch (error) {
      console.error('获取商品信息失败:', error);
      this.renderNoProduct();
    }
  }

  // 渲染当前商品
  renderCurrentProduct() {
    const container = document.getElementById('current-product');
    const { title, price, image, platform, url } = this.currentProduct;

    container.innerHTML = `
      <div class="product-info">
        <img class="product-image" src="${image || 'assets/placeholder.png'}" alt="${title}">
        <div class="product-details">
          <div class="product-title">${title}</div>
          <div class="product-price">
            <span class="currency">¥</span>${price}
          </div>
          <span class="product-platform">${platform}</span>
        </div>
      </div>
    `;
  }

  // 无商品时的渲染
  renderNoProduct() {
    const container = document.getElementById('current-product');
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🛍️</span>
        <p>请在购物网站打开商品页面</p>
        <p class="empty-hint">支持淘宝、京东、拼多多等平台</p>
      </div>
    `;
  }

  // 加载价格对比
  async loadPriceComparison() {
    if (!this.currentProduct) return;

    const priceList = document.getElementById('price-list');
    priceList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>正在全网搜索...</p></div>';

    try {
      const prices = await this.priceComparison.compare(this.currentProduct);
      this.renderPriceList(prices);
      await this.loadPriceHistory();
      await this.loadCoupons();
    } catch (error) {
      priceList.innerHTML = '<p class="error">获取价格失败，请重试</p>';
    }
  }

  // 渲染价格列表
  renderPriceList(prices) {
    const priceList = document.getElementById('price-list');

    if (!prices || prices.length === 0) {
      priceList.innerHTML = '<p class="empty-hint">暂无其他平台价格</p>';
      return;
    }

    // 排序，最低价在前
    prices.sort((a, b) => a.price - b.price);

    priceList.innerHTML = prices.map((item, index) => `
      <div class="price-item ${index === 0 ? 'best' : ''}" data-url="${item.url}">
        <div class="platform-info">
          <img class="platform-logo" src="assets/platforms/${item.platform.toLowerCase()}.png" alt="${item.platform}">
          <span class="platform-name">${item.platform}</span>
        </div>
        <span class="platform-price">¥${item.price}</span>
      </div>
    `).join('');

    // 点击跳转
    priceList.querySelectorAll('.price-item').forEach(item => {
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: item.dataset.url });
      });
    });
  }

  // 加载价格历史
  async loadPriceHistory() {
    if (!this.currentProduct) return;

    try {
      const history = await this.storageManager.getPriceHistory(this.currentProduct.id);

      if (history && history.length > 0) {
        this.chartManager.renderPriceChart('priceChart', history);

        const prices = history.map(h => h.price);
        document.getElementById('lowest-price').textContent = `¥${Math.min(...prices)}`;
        document.getElementById('highest-price').textContent = `¥${Math.max(...prices)}`;
        document.getElementById('avg-price').textContent = `¥${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`;
      }
    } catch (error) {
      console.error('加载价格历史失败:', error);
    }
  }

  // 加载优惠券
  async loadCoupons() {
    if (!this.currentProduct) return;

    const couponList = document.getElementById('coupon-list');

    try {
      const coupons = await this.priceComparison.getCoupons(this.currentProduct);

      if (!coupons || coupons.length === 0) {
        couponList.innerHTML = '<p class="empty-hint">暂无可用优惠券</p>';
        return;
      }

      couponList.innerHTML = coupons.map(coupon => `
        <div class="coupon-item">
          <span class="coupon-value">¥${coupon.value}</span>
          <div class="coupon-info">
            <div class="coupon-title">${coupon.title}</div>
            <div class="coupon-condition">${coupon.condition}</div>
          </div>
          <button class="coupon-btn" data-coupon="${coupon.code}">领取</button>
        </div>
      `).join('');

      couponList.querySelectorAll('.coupon-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(btn.dataset.coupon);
          btn.textContent = '已复制';
          btn.disabled = true;
        });
      });
    } catch (error) {
      couponList.innerHTML = '<p class="empty-hint">获取优惠券失败</p>';
    }
  }

  // 加载AI分析
  async loadAIAnalysis() {
    if (!this.currentProduct) return;

    // 购买建议
    this.loadBuySuggestion();
    // 评论分析
    this.loadReviewAnalysis();
    // 店铺分析
    this.loadShopAnalysis();
    // 相似商品
    this.loadSimilarProducts();
  }

  // 购买建议
  async loadBuySuggestion() {
    const container = document.getElementById('buy-suggestion');

    try {
      const suggestion = await this.aiAnalyzer.getBuySuggestion(this.currentProduct);

      container.innerHTML = `
        <div class="suggestion-verdict">
          <span class="verdict-icon">${suggestion.recommend ? '👍' : suggestion.neutral ? '🤔' : '👎'}</span>
          <span class="verdict-text ${suggestion.recommend ? 'recommend' : suggestion.neutral ? 'neutral' : 'not-recommend'}">
            ${suggestion.recommend ? '推荐购买' : suggestion.neutral ? '可以考虑' : '不建议购买'}
          </span>
        </div>
        <div class="suggestion-reason">${suggestion.reason}</div>
      `;
    } catch (error) {
      container.innerHTML = '<p class="error">分析失败，请重试</p>';
    }
  }

  // 评论分析
  async loadReviewAnalysis() {
    try {
      const analysis = await this.aiAnalyzer.analyzeReviews(this.currentProduct);

      // 情感比例
      document.querySelector('.sentiment-bar .positive').style.width = `${analysis.positive}%`;
      document.querySelector('.sentiment-bar .neutral').style.width = `${analysis.neutral}%`;
      document.querySelector('.sentiment-bar .negative').style.width = `${analysis.negative}%`;

      document.getElementById('positive-pct').textContent = `${analysis.positive}%`;
      document.getElementById('neutral-pct').textContent = `${analysis.neutral}%`;
      document.getElementById('negative-pct').textContent = `${analysis.negative}%`;

      // 刷单警告
      if (analysis.suspiciousReviews) {
        document.getElementById('fake-review-warning').classList.remove('hidden');
      }

      // 优缺点
      const prosList = document.getElementById('pros-list');
      const consList = document.getElementById('cons-list');

      prosList.innerHTML = analysis.pros.map(p => `<li>${p}</li>`).join('');
      consList.innerHTML = analysis.cons.map(c => `<li>${c}</li>`).join('');
    } catch (error) {
      console.error('评论分析失败:', error);
    }
  }

  // 店铺分析
  async loadShopAnalysis() {
    try {
      const shopInfo = await this.aiAnalyzer.analyzeShop(this.currentProduct);

      document.querySelector('.trust-fill').style.width = `${shopInfo.trustScore}%`;
      document.getElementById('trust-score').textContent = `${shopInfo.trustScore}分`;
      document.getElementById('trust-level').textContent = shopInfo.level;

      const warningsList = document.getElementById('shop-warnings');
      warningsList.innerHTML = shopInfo.warnings.map(w =>
        `<li class="${w.type}">${w.icon} ${w.message}</li>`
      ).join('');
    } catch (error) {
      console.error('店铺分析失败:', error);
    }
  }

  // 相似商品
  async loadSimilarProducts() {
    const container = document.getElementById('similar-list');

    try {
      const similar = await this.priceComparison.getSimilarProducts(this.currentProduct);

      if (!similar || similar.length === 0) {
        container.innerHTML = '<p class="empty-hint">暂无相似商品推荐</p>';
        return;
      }

      container.innerHTML = similar.map(item => `
        <div class="similar-item" data-url="${item.url}">
          <img class="similar-image" src="${item.image}" alt="${item.title}">
          <div class="similar-title">${item.title}</div>
          <div class="similar-price">¥${item.price}</div>
        </div>
      `).join('');

      container.querySelectorAll('.similar-item').forEach(item => {
        item.addEventListener('click', () => {
          chrome.tabs.create({ url: item.dataset.url });
        });
      });
    } catch (error) {
      container.innerHTML = '<p class="empty-hint">获取推荐失败</p>';
    }
  }

  // 加载心愿单
  async loadWishlist() {
    const wishlist = await this.wishlistManager.getAll();
    const container = document.getElementById('wishlist-items');
    const countBadge = document.getElementById('wishlist-count');

    countBadge.textContent = wishlist.length;

    if (wishlist.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📋</span>
          <p>心愿单是空的</p>
          <p class="empty-hint">浏览商品时点击 ❤️ 添加</p>
        </div>
      `;
      return;
    }

    container.innerHTML = wishlist.map(item => `
      <div class="wishlist-item" data-id="${item.id}">
        <img class="wishlist-item-image" src="${item.image}" alt="${item.title}">
        <div class="wishlist-item-info">
          <div class="wishlist-item-title">${item.title}</div>
          <div class="wishlist-item-price">
            <span class="current-price">¥${item.currentPrice}</span>
            ${item.originalPrice ? `<span class="original-price">¥${item.originalPrice}</span>` : ''}
            ${item.priceChange ? `<span class="price-change ${item.priceChange > 0 ? 'up' : 'down'}">${item.priceChange > 0 ? '↑' : '↓'}${Math.abs(item.priceChange)}%</span>` : ''}
          </div>
        </div>
        <div class="wishlist-item-actions">
          <button class="view-btn" data-url="${item.url}">查看</button>
          <button class="remove-btn" data-id="${item.id}">删除</button>
        </div>
      </div>
    `).join('');

    // 绑定事件
    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: btn.dataset.url });
      });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.wishlistManager.remove(btn.dataset.id);
        this.loadWishlist();
      });
    });

    // 计算累计省钱
    const totalSaved = wishlist.reduce((sum, item) => {
      if (item.originalPrice && item.currentPrice < item.originalPrice) {
        return sum + (item.originalPrice - item.currentPrice);
      }
      return sum;
    }, 0);

    document.getElementById('total-saved').textContent = `¥${totalSaved.toFixed(2)}`;
  }

  // 加载提醒
  async loadAlerts() {
    const alerts = await this.alertManager.getAll();
    const container = document.getElementById('alerts-list');

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔕</span>
          <p>暂无降价提醒</p>
          <p class="empty-hint">设置目标价格，降价时通知您</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="alert-item" data-id="${alert.id}">
        <img class="alert-item-image" src="${alert.image}" alt="${alert.title}">
        <div class="alert-item-info">
          <div class="alert-item-title">${alert.title}</div>
          <div class="alert-prices">
            <span class="current">当前: ¥${alert.currentPrice}</span>
            <span class="target">目标: ¥${alert.targetPrice}</span>
          </div>
        </div>
        <button class="alert-item-delete" data-id="${alert.id}">🗑️</button>
      </div>
    `).join('');

    container.querySelectorAll('.alert-item-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.alertManager.remove(btn.dataset.id);
        this.loadAlerts();
      });
    });
  }

  // 添加到心愿单
  async addToWishlist() {
    if (!this.currentProduct) {
      alert('请先打开商品页面');
      return;
    }

    await this.wishlistManager.add(this.currentProduct);
    this.loadWishlist();

    // 显示成功提示
    const btn = document.getElementById('addToWishlistBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">✅</span><span>已收藏</span>';
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  }

  // 显示提醒弹窗
  showAlertModal() {
    if (!this.currentProduct) {
      alert('请先打开商品页面');
      return;
    }

    document.getElementById('alert-product-name').value = this.currentProduct.title;
    document.getElementById('alert-current-price').value = `¥${this.currentProduct.price}`;
    document.getElementById('alert-target-price').value = '';
    document.getElementById('alert-modal').classList.remove('hidden');
  }

  // 隐藏提醒弹窗
  hideAlertModal() {
    document.getElementById('alert-modal').classList.add('hidden');
  }

  // 保存提醒
  async saveAlert() {
    const targetPrice = parseFloat(document.getElementById('alert-target-price').value);

    if (!targetPrice || targetPrice <= 0) {
      alert('请输入有效的目标价格');
      return;
    }

    if (targetPrice >= this.currentProduct.price) {
      alert('目标价格应低于当前价格');
      return;
    }

    await this.alertManager.add({
      ...this.currentProduct,
      targetPrice
    });

    this.hideAlertModal();
    this.loadAlerts();
  }

  // 分享商品
  async shareProduct() {
    if (!this.currentProduct) {
      alert('请先打开商品页面');
      return;
    }

    const shareText = `【${this.currentProduct.title}】¥${this.currentProduct.price} ${this.currentProduct.url}`;

    try {
      await navigator.clipboard.writeText(shareText);

      const btn = document.getElementById('shareBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="btn-icon">✅</span><span>已复制</span>';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    } catch (error) {
      alert('复制失败，请手动复制');
    }
  }

  // 刷新比价
  async refreshComparison() {
    const btn = document.getElementById('compareBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span><span>比价中...</span>';

    await this.loadCurrentProduct();

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span><span>立即比价</span>';
  }

  // 以图搜商品
  async handleImageSearch(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;

      try {
        // 发送到后台进行图片搜索
        const results = await chrome.runtime.sendMessage({
          action: 'imageSearch',
          imageData
        });

        if (results && results.length > 0) {
          this.renderImageSearchResults(results);
        } else {
          alert('未找到相似商品');
        }
      } catch (error) {
        alert('图片搜索失败，请重试');
      }
    };
    reader.readAsDataURL(file);
  }

  // 渲染图片搜索结果
  renderImageSearchResults(results) {
    const container = document.getElementById('similar-list');

    container.innerHTML = results.map(item => `
      <div class="similar-item" data-url="${item.url}">
        <img class="similar-image" src="${item.image}" alt="${item.title}">
        <div class="similar-title">${item.title}</div>
        <div class="similar-price">¥${item.price}</div>
      </div>
    `).join('');

    container.querySelectorAll('.similar-item').forEach(item => {
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: item.dataset.url });
      });
    });

    // 切换到分析面板显示结果
    this.switchTab('analysis');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupApp();
});
