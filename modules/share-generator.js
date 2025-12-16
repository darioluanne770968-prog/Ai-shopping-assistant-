/**
 * AI购物助手 - 分享报告生成模块
 * 生成可分享的比价报告和图片
 */

export class ShareGenerator {
  constructor() {
    this.templateStyles = {
      default: {
        primaryColor: '#ff6b35',
        backgroundColor: '#ffffff',
        textColor: '#333333'
      },
      dark: {
        primaryColor: '#ff6b35',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff'
      },
      minimal: {
        primaryColor: '#000000',
        backgroundColor: '#ffffff',
        textColor: '#333333'
      }
    };
  }

  /**
   * 生成比价分享卡片
   */
  async generatePriceCard(product, comparisonData, style = 'default') {
    const template = this.templateStyles[style];

    const cardData = {
      type: 'price_comparison',
      product: {
        title: product.title,
        image: product.image,
        currentPrice: product.price,
        platform: product.platform
      },
      comparison: comparisonData.map(item => ({
        platform: item.platform,
        price: item.price,
        diff: item.price - product.price
      })),
      lowestPrice: Math.min(...comparisonData.map(c => c.price)),
      savings: product.price - Math.min(...comparisonData.map(c => c.price)),
      timestamp: new Date().toLocaleString('zh-CN'),
      style: template
    };

    // 生成HTML卡片
    const html = this.renderPriceCardHTML(cardData);

    // 转换为图片（需要在实际环境中使用html2canvas等库）
    return {
      html,
      data: cardData,
      shareText: this.generateShareText(cardData)
    };
  }

  /**
   * 渲染价格卡片HTML
   */
  renderPriceCardHTML(data) {
    const { product, comparison, savings, timestamp, style } = data;

    return `
      <div style="
        width: 350px;
        background: ${style.backgroundColor};
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: -apple-system, sans-serif;
      ">
        <!-- 头部 -->
        <div style="
          background: ${style.primaryColor};
          padding: 16px;
          color: white;
          text-align: center;
        ">
          <div style="font-size: 14px; opacity: 0.9;">🛒 AI购物助手</div>
          <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">比价报告</div>
        </div>

        <!-- 商品信息 -->
        <div style="padding: 16px;">
          <div style="display: flex; gap: 12px;">
            <img src="${product.image}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
            <div style="flex: 1;">
              <div style="
                font-size: 14px;
                color: ${style.textColor};
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              ">${product.title}</div>
              <div style="
                font-size: 20px;
                font-weight: bold;
                color: #ff4d4f;
                margin-top: 8px;
              ">¥${product.currentPrice}</div>
              <div style="font-size: 12px; color: #999;">${product.platform}</div>
            </div>
          </div>
        </div>

        <!-- 比价结果 -->
        <div style="padding: 0 16px 16px;">
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px; color: ${style.textColor};">
            📊 全网价格对比
          </div>
          ${comparison.map((item, index) => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px;
              background: ${index === 0 ? '#fff7e6' : '#f5f5f5'};
              border-radius: 8px;
              margin-bottom: 6px;
              ${index === 0 ? 'border: 1px solid #ffc53d;' : ''}
            ">
              <span style="font-size: 13px; color: ${style.textColor};">
                ${index === 0 ? '👑 ' : ''}${item.platform}
              </span>
              <span style="
                font-size: 15px;
                font-weight: 600;
                color: ${item.diff < 0 ? '#52c41a' : '#ff4d4f'};
              ">
                ¥${item.price}
                ${item.diff !== 0 ? `<span style="font-size: 11px; margin-left: 4px;">
                  ${item.diff > 0 ? '+' : ''}${item.diff.toFixed(0)}
                </span>` : ''}
              </span>
            </div>
          `).join('')}
        </div>

        <!-- 节省金额 -->
        ${savings > 0 ? `
          <div style="
            margin: 0 16px 16px;
            padding: 12px;
            background: linear-gradient(135deg, #52c41a, #73d13d);
            border-radius: 8px;
            text-align: center;
            color: white;
          ">
            <div style="font-size: 12px; opacity: 0.9;">选择最低价可省</div>
            <div style="font-size: 24px; font-weight: bold;">¥${savings.toFixed(0)}</div>
          </div>
        ` : ''}

        <!-- 底部 -->
        <div style="
          padding: 12px 16px;
          background: #fafafa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #999;
        ">
          <span>${timestamp}</span>
          <span>扫码下载 AI购物助手</span>
        </div>
      </div>
    `;
  }

  /**
   * 生成分享文本
   */
  generateShareText(data) {
    const { product, lowestPrice, savings } = data;

    let text = `【比价发现】${product.title.substring(0, 30)}...\n`;
    text += `💰 当前价: ¥${product.currentPrice}\n`;
    text += `🏆 全网最低: ¥${lowestPrice}\n`;

    if (savings > 0) {
      text += `💵 可省: ¥${savings.toFixed(0)}\n`;
    }

    text += `\n📲 AI购物助手帮你省钱购物`;

    return text;
  }

  /**
   * 生成价格走势分享图
   */
  async generatePriceHistoryCard(product, priceHistory, style = 'default') {
    const template = this.templateStyles[style];

    const prices = priceHistory.map(h => h.price);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const currentPrice = prices[prices.length - 1];

    const cardData = {
      type: 'price_history',
      product: {
        title: product.title,
        image: product.image
      },
      priceHistory,
      stats: {
        current: currentPrice,
        lowest: lowestPrice,
        highest: highestPrice,
        trend: currentPrice <= lowestPrice * 1.05 ? 'low' : currentPrice >= highestPrice * 0.95 ? 'high' : 'normal'
      },
      timestamp: new Date().toLocaleString('zh-CN'),
      style: template
    };

    return {
      data: cardData,
      shareText: this.generateHistoryShareText(cardData)
    };
  }

  /**
   * 生成价格历史分享文本
   */
  generateHistoryShareText(data) {
    const { product, stats } = data;

    let text = `【价格走势】${product.title.substring(0, 30)}...\n`;
    text += `📈 历史最高: ¥${stats.highest}\n`;
    text += `📉 历史最低: ¥${stats.lowest}\n`;
    text += `💰 当前价格: ¥${stats.current}\n`;

    if (stats.trend === 'low') {
      text += `\n🎉 现在是好价！`;
    } else if (stats.trend === 'high') {
      text += `\n⚠️ 价格偏高，建议等等`;
    }

    return text;
  }

  /**
   * 生成省钱报告
   */
  async generateSavingsReport(period, data) {
    const { totalSaved, itemCount, topCategory, monthlyData } = data;

    const reportData = {
      type: 'savings_report',
      period,
      totalSaved,
      itemCount,
      topCategory,
      monthlyData,
      timestamp: new Date().toLocaleString('zh-CN')
    };

    return {
      data: reportData,
      shareText: this.generateSavingsShareText(reportData)
    };
  }

  /**
   * 生成省钱分享文本
   */
  generateSavingsShareText(data) {
    const { period, totalSaved, itemCount } = data;

    let text = `【省钱报告】${period}\n`;
    text += `🛒 比价商品: ${itemCount}件\n`;
    text += `💰 累计节省: ¥${totalSaved.toFixed(0)}\n`;
    text += `\n📲 用AI购物助手，购物更省钱`;

    return text;
  }

  /**
   * 生成商品对比卡片
   */
  async generateComparisonCard(products, comparison) {
    const cardData = {
      type: 'product_comparison',
      products: products.map(p => ({
        title: p.title,
        image: p.image,
        price: p.price,
        platform: p.platform
      })),
      winner: comparison.recommendation.overall.product.title,
      reason: comparison.recommendation.overall.reason,
      timestamp: new Date().toLocaleString('zh-CN')
    };

    return {
      data: cardData,
      shareText: this.generateComparisonShareText(cardData)
    };
  }

  /**
   * 生成对比分享文本
   */
  generateComparisonShareText(data) {
    const { products, winner, reason } = data;

    let text = `【商品对比】\n`;
    products.forEach((p, i) => {
      text += `${i + 1}. ${p.title.substring(0, 20)}... ¥${p.price}\n`;
    });
    text += `\n🏆 推荐: ${winner.substring(0, 20)}...\n`;
    text += `📝 理由: ${reason}`;

    return text;
  }

  /**
   * 复制到剪贴板
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 分享到社交平台
   */
  async shareTo(platform, content) {
    const shareUrls = {
      weibo: `https://service.weibo.com/share/share.php?title=${encodeURIComponent(content.text)}`,
      wechat: null, // 微信需要调用JSSDK
      qq: `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(content.title)}&summary=${encodeURIComponent(content.text)}`
    };

    const url = shareUrls[platform];
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      return { success: true };
    }

    return { success: false, message: '不支持的分享平台' };
  }

  /**
   * 生成分享链接
   */
  generateShareLink(productId, type = 'comparison') {
    // 实际应用中应该生成真实的分享链接
    const baseUrl = 'https://ai-shopping-assistant.example.com/share';
    return `${baseUrl}?id=${productId}&type=${type}&t=${Date.now()}`;
  }
}
