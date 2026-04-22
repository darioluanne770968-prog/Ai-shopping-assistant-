/**
 * AI购物助手 - 工具函数
 */

/**
 * 转义 HTML 特殊字符，防止 XSS 攻击
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 安全地设置元素的 HTML 内容
 * @param {HTMLElement} element - 目标元素
 * @param {string} html - HTML 内容（应该是可信的模板）
 */
export function setInnerHTML(element, html) {
  if (!element) return;
  // 清空现有内容
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  // 使用 template 元素安全解析 HTML
  const template = document.createElement('template');
  template.innerHTML = html;
  element.appendChild(template.content.cloneNode(true));
}

/**
 * 创建安全的商品卡片 HTML
 * @param {Object} product - 商品对象
 * @returns {string} 安全的 HTML 字符串
 */
export function createProductCardHTML(product) {
  const title = escapeHtml(product.title);
  const price = escapeHtml(product.price);
  const image = escapeHtml(product.image || 'assets/placeholder.png');
  const platform = escapeHtml(product.platform);

  return `
    <div class="product-info">
      <img class="product-image" src="${image}" alt="${title}">
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

/**
 * 创建价格列表项 HTML
 * @param {Object} item - 价格项
 * @param {number} index - 索引
 * @returns {string} 安全的 HTML 字符串
 */
export function createPriceItemHTML(item, index) {
  const platform = escapeHtml(item.platform);
  const price = escapeHtml(item.price);
  const url = escapeHtml(item.url);

  return `
    <div class="price-item ${index === 0 ? 'best' : ''}" data-url="${url}">
      <div class="platform-info">
        <img class="platform-logo" src="assets/platforms/${platform.toLowerCase()}.png" alt="${platform}">
        <span class="platform-name">${platform}</span>
      </div>
      <span class="platform-price">¥${price}</span>
    </div>
  `;
}

/**
 * 创建心愿单项 HTML
 * @param {Object} item - 心愿单项
 * @returns {string} 安全的 HTML 字符串
 */
export function createWishlistItemHTML(item) {
  const id = escapeHtml(item.id);
  const title = escapeHtml(item.title);
  const image = escapeHtml(item.image);
  const currentPrice = escapeHtml(item.currentPrice);
  const originalPrice = item.originalPrice ? escapeHtml(item.originalPrice) : null;
  const url = escapeHtml(item.url);
  const priceChange = item.priceChange;

  let priceChangeHTML = '';
  if (priceChange) {
    const changeClass = priceChange > 0 ? 'up' : 'down';
    const changeArrow = priceChange > 0 ? '↑' : '↓';
    priceChangeHTML = `<span class="price-change ${changeClass}">${changeArrow}${Math.abs(priceChange)}%</span>`;
  }

  return `
    <div class="wishlist-item" data-id="${id}">
      <img class="wishlist-item-image" src="${image}" alt="${title}">
      <div class="wishlist-item-info">
        <div class="wishlist-item-title">${title}</div>
        <div class="wishlist-item-price">
          <span class="current-price">¥${currentPrice}</span>
          ${originalPrice ? `<span class="original-price">¥${originalPrice}</span>` : ''}
          ${priceChangeHTML}
        </div>
      </div>
      <div class="wishlist-item-actions">
        <button class="view-btn" data-url="${url}">查看</button>
        <button class="remove-btn" data-id="${id}">删除</button>
      </div>
    </div>
  `;
}

/**
 * 创建提醒项 HTML
 * @param {Object} alert - 提醒项
 * @returns {string} 安全的 HTML 字符串
 */
export function createAlertItemHTML(alert) {
  const id = escapeHtml(alert.id);
  const title = escapeHtml(alert.title);
  const image = escapeHtml(alert.image);
  const currentPrice = escapeHtml(alert.currentPrice);
  const targetPrice = escapeHtml(alert.targetPrice);

  return `
    <div class="alert-item" data-id="${id}">
      <img class="alert-item-image" src="${image}" alt="${title}">
      <div class="alert-item-info">
        <div class="alert-item-title">${title}</div>
        <div class="alert-prices">
          <span class="current">当前: ¥${currentPrice}</span>
          <span class="target">目标: ¥${targetPrice}</span>
        </div>
      </div>
      <button class="alert-item-delete" data-id="${id}">🗑️</button>
    </div>
  `;
}

/**
 * 创建优惠券项 HTML
 * @param {Object} coupon - 优惠券
 * @returns {string} 安全的 HTML 字符串
 */
export function createCouponItemHTML(coupon) {
  const value = escapeHtml(coupon.value);
  const title = escapeHtml(coupon.title);
  const condition = escapeHtml(coupon.condition);
  const code = escapeHtml(coupon.code);

  return `
    <div class="coupon-item">
      <span class="coupon-value">¥${value}</span>
      <div class="coupon-info">
        <div class="coupon-title">${title}</div>
        <div class="coupon-condition">${condition}</div>
      </div>
      <button class="coupon-btn" data-coupon="${code}">领取</button>
    </div>
  `;
}

/**
 * 创建相似商品项 HTML
 * @param {Object} item - 商品
 * @returns {string} 安全的 HTML 字符串
 */
export function createSimilarItemHTML(item) {
  const title = escapeHtml(item.title);
  const image = escapeHtml(item.image);
  const price = escapeHtml(item.price);
  const url = escapeHtml(item.url);

  return `
    <div class="similar-item" data-url="${url}">
      <img class="similar-image" src="${image}" alt="${title}">
      <div class="similar-title">${title}</div>
      <div class="similar-price">¥${price}</div>
    </div>
  `;
}
