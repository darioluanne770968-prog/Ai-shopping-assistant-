/**
 * AI购物助手 - Content Script
 * 注入到购物网站，识别商品信息并显示悬浮比价窗口
 */

class ShoppingAssistant {
  constructor() {
    this.currentProduct = null;
    this.floatingPanel = null;
    this.platform = this.detectPlatform();

    this.init();
  }

  init() {
    // 检测是否在商品详情页
    if (this.isProductPage()) {
      this.extractProductInfo();
      this.injectFloatingPanel();
    }

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // 监听页面变化（SPA应用）
    this.observePageChanges();
  }

  // 检测当前平台
  detectPlatform() {
    const host = window.location.hostname;

    if (host.includes('taobao.com')) return 'taobao';
    if (host.includes('tmall.com')) return 'tmall';
    if (host.includes('jd.com')) return 'jd';
    if (host.includes('pinduoduo.com')) return 'pdd';
    if (host.includes('suning.com')) return 'suning';
    if (host.includes('vip.com')) return 'vipshop';
    if (host.includes('amazon.cn')) return 'amazon';
    if (host.includes('dangdang.com')) return 'dangdang';

    return 'unknown';
  }

  // 判断是否为商品详情页
  isProductPage() {
    const url = window.location.href;
    const patterns = {
      taobao: /item\.taobao\.com\/item\.htm/,
      tmall: /detail\.tmall\.com\/item\.htm/,
      jd: /item\.jd\.com\/\d+\.html/,
      pdd: /mobile\.yangkeduo\.com\/goods/,
      suning: /product\.suning\.com\/\d+\/\d+\.html/,
      vipshop: /detail\.vip\.com\/detail/,
      amazon: /amazon\.cn\/dp\//,
      dangdang: /product\.dangdang\.com\/\d+\.html/
    };

    return patterns[this.platform]?.test(url) || false;
  }

  // 提取商品信息
  extractProductInfo() {
    const extractors = {
      taobao: () => this.extractTaobaoProduct(),
      tmall: () => this.extractTmallProduct(),
      jd: () => this.extractJDProduct(),
      pdd: () => this.extractPDDProduct(),
      suning: () => this.extractSuningProduct(),
      vipshop: () => this.extractVipshopProduct(),
      amazon: () => this.extractAmazonProduct(),
      dangdang: () => this.extractDangdangProduct()
    };

    const extractor = extractors[this.platform];
    if (extractor) {
      this.currentProduct = extractor();
    }
  }

  // 淘宝商品提取
  extractTaobaoProduct() {
    const title = document.querySelector('.tb-main-title')?.textContent?.trim() ||
      document.querySelector('[data-title]')?.dataset.title ||
      document.querySelector('h1')?.textContent?.trim();

    const priceEl = document.querySelector('.tb-rmb-num') ||
      document.querySelector('.tm-price') ||
      document.querySelector('[class*="price"]');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;

    const image = document.querySelector('#J_ImgBooth')?.src ||
      document.querySelector('.tb-pic img')?.src ||
      document.querySelector('[class*="main-image"] img')?.src;

    const id = new URL(window.location.href).searchParams.get('id');

    return {
      id: `taobao_${id}`,
      title,
      price,
      image,
      platform: '淘宝',
      platformKey: 'taobao',
      url: window.location.href,
      shopName: document.querySelector('.tb-seller-name')?.textContent?.trim(),
      sales: document.querySelector('.tb-sold-out')?.textContent?.trim()
    };
  }

  // 天猫商品提取
  extractTmallProduct() {
    const title = document.querySelector('.ItemHeader--mainTitle--3CIjqW5')?.textContent?.trim() ||
      document.querySelector('[class*="mainTitle"]')?.textContent?.trim();

    const priceEl = document.querySelector('.Price--priceText--2nLbVda') ||
      document.querySelector('[class*="priceText"]');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;

    const image = document.querySelector('.PicGallery--mainPic--2b0BkUF img')?.src ||
      document.querySelector('[class*="mainPic"] img')?.src;

    const id = new URL(window.location.href).searchParams.get('id');

    return {
      id: `tmall_${id}`,
      title,
      price,
      image,
      platform: '天猫',
      platformKey: 'tmall',
      url: window.location.href,
      shopName: document.querySelector('[class*="shopName"]')?.textContent?.trim()
    };
  }

  // 京东商品提取
  extractJDProduct() {
    const title = document.querySelector('.sku-name')?.textContent?.trim() ||
      document.querySelector('.itemInfo-wrap .sku-name')?.textContent?.trim();

    const priceEl = document.querySelector('.p-price .price') ||
      document.querySelector('.J-p-');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;

    const image = document.querySelector('#spec-img')?.src ||
      document.querySelector('.product-img img')?.src;

    const match = window.location.pathname.match(/\/(\d+)\.html/);
    const id = match ? match[1] : '';

    return {
      id: `jd_${id}`,
      title,
      price,
      image,
      platform: '京东',
      platformKey: 'jd',
      url: window.location.href,
      shopName: document.querySelector('.J-hove-wrap .name a')?.textContent?.trim()
    };
  }

  // 拼多多商品提取
  extractPDDProduct() {
    const title = document.querySelector('.goods-name')?.textContent?.trim() ||
      document.querySelector('[class*="goodsName"]')?.textContent?.trim();

    const priceEl = document.querySelector('.price-num') ||
      document.querySelector('[class*="priceNum"]');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;

    const image = document.querySelector('.goods-gallery img')?.src;

    const match = window.location.href.match(/goods_id=(\d+)/);
    const id = match ? match[1] : '';

    return {
      id: `pdd_${id}`,
      title,
      price,
      image,
      platform: '拼多多',
      platformKey: 'pdd',
      url: window.location.href
    };
  }

  // 苏宁商品提取
  extractSuningProduct() {
    const title = document.querySelector('.proTitle h1')?.textContent?.trim();
    const priceEl = document.querySelector('.mainprice .price');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;
    const image = document.querySelector('#bigImg img')?.src;

    const match = window.location.pathname.match(/\/(\d+)\/(\d+)\.html/);
    const id = match ? `${match[1]}_${match[2]}` : '';

    return {
      id: `suning_${id}`,
      title,
      price,
      image,
      platform: '苏宁',
      platformKey: 'suning',
      url: window.location.href
    };
  }

  // 唯品会商品提取
  extractVipshopProduct() {
    const title = document.querySelector('.pib-title-class')?.textContent?.trim();
    const priceEl = document.querySelector('.pbox-price');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;
    const image = document.querySelector('.J-pic-box img')?.src;

    const match = window.location.href.match(/detail-(\d+)-(\d+)/);
    const id = match ? `${match[1]}_${match[2]}` : '';

    return {
      id: `vipshop_${id}`,
      title,
      price,
      image,
      platform: '唯品会',
      platformKey: 'vipshop',
      url: window.location.href
    };
  }

  // 亚马逊商品提取
  extractAmazonProduct() {
    const title = document.querySelector('#productTitle')?.textContent?.trim();
    const priceEl = document.querySelector('.a-price .a-offscreen');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;
    const image = document.querySelector('#landingImage')?.src;

    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]+)/);
    const id = match ? match[1] : '';

    return {
      id: `amazon_${id}`,
      title,
      price,
      image,
      platform: '亚马逊',
      platformKey: 'amazon',
      url: window.location.href
    };
  }

  // 当当商品提取
  extractDangdangProduct() {
    const title = document.querySelector('.name_info h1')?.textContent?.trim();
    const priceEl = document.querySelector('.price .num');
    const price = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, '')) || 0;
    const image = document.querySelector('#main-img-slider img')?.src;

    const match = window.location.pathname.match(/\/(\d+)\.html/);
    const id = match ? match[1] : '';

    return {
      id: `dangdang_${id}`,
      title,
      price,
      image,
      platform: '当当',
      platformKey: 'dangdang',
      url: window.location.href
    };
  }

  // 注入悬浮比价面板
  injectFloatingPanel() {
    if (!this.currentProduct || this.floatingPanel) return;

    // 创建面板容器
    this.floatingPanel = document.createElement('div');
    this.floatingPanel.id = 'ai-shopping-assistant-panel';
    this.floatingPanel.innerHTML = this.getFloatingPanelHTML();

    document.body.appendChild(this.floatingPanel);

    // 绑定事件
    this.bindPanelEvents();

    // 加载比价数据
    this.loadComparisonData();
  }

  // 获取悬浮面板HTML
  getFloatingPanelHTML() {
    return `
      <div class="asa-panel">
        <div class="asa-panel-header">
          <div class="asa-logo">
            <span class="asa-icon">🛒</span>
            <span class="asa-title">AI购物助手</span>
          </div>
          <div class="asa-actions">
            <button class="asa-btn-minimize" title="最小化">−</button>
            <button class="asa-btn-close" title="关闭">×</button>
          </div>
        </div>

        <div class="asa-panel-body">
          <!-- 价格概览 -->
          <div class="asa-price-overview">
            <div class="asa-current-price">
              <span class="asa-label">当前价格</span>
              <span class="asa-value">¥${this.currentProduct?.price || '--'}</span>
            </div>
            <div class="asa-best-price">
              <span class="asa-label">全网最低</span>
              <span class="asa-value loading">查询中...</span>
            </div>
          </div>

          <!-- 价格走势指示器 -->
          <div class="asa-price-indicator">
            <div class="asa-indicator-bar">
              <div class="asa-indicator-fill" style="width: 50%"></div>
              <div class="asa-indicator-marker" style="left: 50%"></div>
            </div>
            <div class="asa-indicator-labels">
              <span>历史最低</span>
              <span>历史最高</span>
            </div>
          </div>

          <!-- 比价列表 -->
          <div class="asa-comparison-list">
            <div class="asa-loading">
              <div class="asa-spinner"></div>
              <span>正在全网搜索...</span>
            </div>
          </div>

          <!-- AI建议 -->
          <div class="asa-ai-suggestion">
            <div class="asa-suggestion-icon">🤖</div>
            <div class="asa-suggestion-text">AI正在分析...</div>
          </div>

          <!-- 快捷操作 -->
          <div class="asa-quick-actions">
            <button class="asa-action-btn" data-action="wishlist">
              <span>❤️</span>
              <span>收藏</span>
            </button>
            <button class="asa-action-btn" data-action="alert">
              <span>🔔</span>
              <span>降价提醒</span>
            </button>
            <button class="asa-action-btn" data-action="history">
              <span>📈</span>
              <span>价格历史</span>
            </button>
            <button class="asa-action-btn" data-action="share">
              <span>📤</span>
              <span>分享</span>
            </button>
          </div>
        </div>

        <div class="asa-panel-footer">
          <span class="asa-update-time">刚刚更新</span>
          <button class="asa-refresh-btn">🔄 刷新</button>
        </div>
      </div>

      <!-- 最小化状态 -->
      <div class="asa-minimized">
        <span class="asa-mini-icon">🛒</span>
        <span class="asa-mini-price">¥${this.currentProduct?.price || '--'}</span>
      </div>
    `;
  }

  // 绑定面板事件
  bindPanelEvents() {
    const panel = this.floatingPanel;

    // 最小化
    panel.querySelector('.asa-btn-minimize').addEventListener('click', () => {
      panel.classList.toggle('minimized');
    });

    // 关闭
    panel.querySelector('.asa-btn-close').addEventListener('click', () => {
      panel.remove();
      this.floatingPanel = null;
    });

    // 展开最小化状态
    panel.querySelector('.asa-minimized').addEventListener('click', () => {
      panel.classList.remove('minimized');
    });

    // 刷新
    panel.querySelector('.asa-refresh-btn').addEventListener('click', () => {
      this.loadComparisonData();
    });

    // 快捷操作
    panel.querySelectorAll('.asa-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleQuickAction(btn.dataset.action);
      });
    });

    // 拖动功能
    this.initDrag();
  }

  // 拖动功能
  initDrag() {
    const panel = this.floatingPanel.querySelector('.asa-panel');
    const header = panel.querySelector('.asa-panel-header');
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.asa-actions')) return;
      isDragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      panel.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      panel.style.cursor = 'default';
    });
  }

  // 加载比价数据
  async loadComparisonData() {
    if (!this.currentProduct) return;

    const listContainer = this.floatingPanel.querySelector('.asa-comparison-list');

    try {
      // 请求后台比价
      const response = await chrome.runtime.sendMessage({
        action: 'comparePrices',
        data: this.currentProduct
      });

      if (response.success && response.prices) {
        this.renderComparisonList(response.prices);
        this.updateBestPrice(response.prices);
        this.updatePriceIndicator(response.prices);
      } else {
        listContainer.innerHTML = '<div class="asa-error">获取价格失败</div>';
      }

      // 获取AI建议
      this.loadAISuggestion();

    } catch (error) {
      console.error('加载比价数据失败:', error);
      listContainer.innerHTML = '<div class="asa-error">获取价格失败，请重试</div>';
    }
  }

  // 渲染比价列表
  renderComparisonList(prices) {
    const listContainer = this.floatingPanel.querySelector('.asa-comparison-list');

    if (!prices || prices.length === 0) {
      listContainer.innerHTML = '<div class="asa-empty">暂无其他平台价格</div>';
      return;
    }

    // 排序
    prices.sort((a, b) => a.price - b.price);

    listContainer.innerHTML = prices.map((item, index) => `
      <div class="asa-price-item ${index === 0 ? 'best' : ''}" data-url="${item.url}">
        <div class="asa-platform">
          <img src="${chrome.runtime.getURL(`assets/platforms/${item.platform.toLowerCase()}.png`)}" alt="${item.platform}">
          <span>${item.platform}</span>
        </div>
        <div class="asa-price ${item.price < this.currentProduct.price ? 'lower' : item.price > this.currentProduct.price ? 'higher' : ''}">
          ¥${item.price}
          ${item.price < this.currentProduct.price ? `<span class="asa-save">省¥${(this.currentProduct.price - item.price).toFixed(2)}</span>` : ''}
        </div>
      </div>
    `).join('');

    // 点击跳转
    listContainer.querySelectorAll('.asa-price-item').forEach(item => {
      item.addEventListener('click', () => {
        window.open(item.dataset.url, '_blank');
      });
    });
  }

  // 更新最优价格
  updateBestPrice(prices) {
    if (!prices || prices.length === 0) return;

    const bestPrice = Math.min(...prices.map(p => p.price));
    const bestPriceEl = this.floatingPanel.querySelector('.asa-best-price .asa-value');
    bestPriceEl.classList.remove('loading');
    bestPriceEl.textContent = `¥${bestPrice}`;

    if (bestPrice < this.currentProduct.price) {
      bestPriceEl.classList.add('lower');
    }
  }

  // 更新价格指示器
  updatePriceIndicator(prices) {
    // 基于历史数据计算位置（模拟）
    const allPrices = [this.currentProduct.price, ...prices.map(p => p.price)];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const current = this.currentProduct.price;

    const percentage = max > min ? ((current - min) / (max - min)) * 100 : 50;

    const fill = this.floatingPanel.querySelector('.asa-indicator-fill');
    const marker = this.floatingPanel.querySelector('.asa-indicator-marker');

    fill.style.width = `${percentage}%`;
    marker.style.left = `${percentage}%`;
  }

  // 加载AI建议
  async loadAISuggestion() {
    const suggestionEl = this.floatingPanel.querySelector('.asa-suggestion-text');

    try {
      // 模拟AI分析结果
      await new Promise(resolve => setTimeout(resolve, 1000));

      const suggestions = [
        { type: 'good', text: '当前价格接近历史最低，推荐购买！' },
        { type: 'wait', text: '价格偏高，建议等待降价或大促' },
        { type: 'check', text: '发现更低价格平台，建议对比购买' }
      ];

      const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      suggestionEl.textContent = suggestion.text;
      suggestionEl.className = `asa-suggestion-text ${suggestion.type}`;
    } catch (error) {
      suggestionEl.textContent = '分析失败';
    }
  }

  // 快捷操作处理
  async handleQuickAction(action) {
    switch (action) {
      case 'wishlist':
        await this.addToWishlist();
        break;
      case 'alert':
        await this.setAlert();
        break;
      case 'history':
        this.showPriceHistory();
        break;
      case 'share':
        await this.shareProduct();
        break;
    }
  }

  // 添加到心愿单
  async addToWishlist() {
    try {
      await chrome.runtime.sendMessage({
        action: 'addToWishlist',
        data: this.currentProduct
      });
      this.showToast('已添加到心愿单 ❤️');
    } catch (error) {
      this.showToast('添加失败，请重试');
    }
  }

  // 设置降价提醒
  async setAlert() {
    const targetPrice = prompt(
      `当前价格: ¥${this.currentProduct.price}\n请输入目标价格:`,
      Math.floor(this.currentProduct.price * 0.9)
    );

    if (targetPrice && !isNaN(targetPrice)) {
      try {
        await chrome.runtime.sendMessage({
          action: 'addAlert',
          data: {
            ...this.currentProduct,
            targetPrice: parseFloat(targetPrice)
          }
        });
        this.showToast(`已设置降价提醒: ¥${targetPrice}`);
      } catch (error) {
        this.showToast('设置失败，请重试');
      }
    }
  }

  // 显示价格历史
  showPriceHistory() {
    chrome.runtime.sendMessage({
      action: 'openPriceHistory',
      data: this.currentProduct
    });
  }

  // 分享商品
  async shareProduct() {
    const text = `【${this.currentProduct.title}】¥${this.currentProduct.price} ${this.currentProduct.url}`;

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('已复制分享链接');
    } catch (error) {
      this.showToast('复制失败');
    }
  }

  // 显示提示
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'asa-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 处理消息
  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getProductInfo':
        sendResponse({ product: this.currentProduct });
        break;

      case 'refreshProduct':
        this.extractProductInfo();
        sendResponse({ product: this.currentProduct });
        break;

      case 'showPanel':
        if (!this.floatingPanel) {
          this.injectFloatingPanel();
        }
        this.floatingPanel.classList.remove('minimized');
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: '未知操作' });
    }
  }

  // 监听页面变化
  observePageChanges() {
    // 使用MutationObserver监听SPA页面变化
    const observer = new MutationObserver((mutations) => {
      // 检测URL变化
      if (this.lastUrl !== window.location.href) {
        this.lastUrl = window.location.href;

        // 重新检测并提取商品信息
        if (this.isProductPage()) {
          setTimeout(() => {
            this.extractProductInfo();
            if (this.floatingPanel) {
              this.updateFloatingPanel();
            } else {
              this.injectFloatingPanel();
            }
          }, 1000);
        } else if (this.floatingPanel) {
          this.floatingPanel.remove();
          this.floatingPanel = null;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.lastUrl = window.location.href;
  }

  // 更新悬浮面板
  updateFloatingPanel() {
    if (!this.floatingPanel || !this.currentProduct) return;

    // 更新价格显示
    this.floatingPanel.querySelector('.asa-current-price .asa-value').textContent =
      `¥${this.currentProduct.price}`;
    this.floatingPanel.querySelector('.asa-mini-price').textContent =
      `¥${this.currentProduct.price}`;

    // 重新加载比价数据
    this.loadComparisonData();
  }
}

// 初始化
new ShoppingAssistant();
