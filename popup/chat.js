/**
 * AI购物助手 - 智能对话界面
 */

import { AIChat } from '../modules/ai-chat.js';
import { PricePredictor } from '../modules/price-predictor.js';
import { SalesCalendar } from '../modules/sales-calendar.js';
import { ProductComparator } from '../modules/product-comparator.js';
import { RecommendationEngine } from '../modules/recommendation-engine.js';
import { StorageManager } from '../modules/storage.js';

class ChatInterface {
  constructor() {
    this.aiChat = new AIChat();
    this.pricePredictor = new PricePredictor();
    this.salesCalendar = new SalesCalendar();
    this.productComparator = new ProductComparator();
    this.storage = new StorageManager();
    this.recommendationEngine = new RecommendationEngine(this.storage);

    this.currentProduct = null;
    this.isTyping = false;

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadProductContext();
    this.updateQuickQuestions();
  }

  bindEvents() {
    // 返回按钮
    document.getElementById('backBtn').addEventListener('click', () => {
      window.close();
    });

    // 菜单按钮
    document.getElementById('menuBtn').addEventListener('click', () => {
      this.toggleFeaturePanel();
    });

    // 发送按钮
    document.getElementById('sendBtn').addEventListener('click', () => {
      this.sendMessage();
    });

    // 输入框回车
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 快捷问题
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sendMessage(btn.dataset.question);
      });
    });

    // 功能面板
    document.getElementById('closePanelBtn').addEventListener('click', () => {
      this.toggleFeaturePanel(false);
    });

    document.querySelectorAll('.feature-item').forEach(item => {
      item.addEventListener('click', () => {
        this.handleFeature(item.dataset.feature);
      });
    });

    // 语音输入（可扩展）
    document.getElementById('voiceBtn').addEventListener('click', () => {
      this.showToast('语音功能开发中...');
    });
  }

  // 加载商品上下文
  async loadProductContext() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' });

      if (response && response.product) {
        this.currentProduct = response.product;
        this.aiChat.setProductContext(response.product);
        this.showProductContext();
      }
    } catch (error) {
      console.log('未检测到商品页面');
    }
  }

  // 显示商品上下文
  showProductContext() {
    const ctx = document.getElementById('product-context');
    ctx.classList.remove('hidden');

    document.getElementById('context-image').src = this.currentProduct.image || '';
    document.getElementById('context-title').textContent = this.currentProduct.title;
    document.getElementById('context-price').textContent = `¥${this.currentProduct.price}`;
  }

  // 更新快捷问题
  updateQuickQuestions() {
    const questions = this.aiChat.getQuickQuestions();
    const container = document.getElementById('quickQuestions');

    container.innerHTML = questions.map(q =>
      `<button class="quick-btn" data-question="${q}">${q}</button>`
    ).join('');

    container.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sendMessage(btn.dataset.question);
      });
    });
  }

  // 发送消息
  async sendMessage(text) {
    const input = document.getElementById('messageInput');
    const message = text || input.value.trim();

    if (!message || this.isTyping) return;

    // 清空输入框
    input.value = '';

    // 显示用户消息
    this.addMessage(message, 'user');

    // 显示正在输入
    this.showTyping();

    try {
      // 获取AI回复
      const response = await this.aiChat.chat(message);

      // 隐藏正在输入
      this.hideTyping();

      // 显示AI回复
      this.addMessage(response.text, 'ai', response.type, response.data);

      // 如果有推荐数据，显示推荐卡片
      if (response.data?.recommendations) {
        this.showRecommendationCards(response.data.recommendations);
      }
    } catch (error) {
      this.hideTyping();
      this.addMessage('抱歉，处理您的问题时出现了错误，请重试。', 'ai', 'error');
    }
  }

  // 添加消息
  addMessage(text, sender, type = '', data = null) {
    const container = document.getElementById('chatMessages');

    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}`;

    const avatar = sender === 'ai' ? '🤖' : '👤';

    messageEl.innerHTML = `
      <div class="avatar">${avatar}</div>
      <div class="content ${type}">${this.formatMessage(text)}</div>
    `;

    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
  }

  // 格式化消息
  formatMessage(text) {
    // 将换行转为<br>
    return text.replace(/\n/g, '<br>');
  }

  // 显示正在输入
  showTyping() {
    this.isTyping = true;
    const container = document.getElementById('chatMessages');

    const typingEl = document.createElement('div');
    typingEl.className = 'message ai';
    typingEl.id = 'typing-message';
    typingEl.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;

    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  }

  // 隐藏正在输入
  hideTyping() {
    this.isTyping = false;
    const typingEl = document.getElementById('typing-message');
    if (typingEl) typingEl.remove();
  }

  // 显示推荐卡片
  showRecommendationCards(recommendations) {
    const container = document.getElementById('chatMessages');

    const cardsEl = document.createElement('div');
    cardsEl.className = 'message ai';
    cardsEl.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="content">
        <div class="recommendation-cards">
          ${recommendations.map(rec => `
            <div class="rec-card" data-url="${rec.url || '#'}">
              <img src="${rec.image || 'https://via.placeholder.com/100'}" alt="">
              <div class="rec-card-info">
                <div class="rec-card-title">${rec.title}</div>
                <div class="rec-card-price">¥${rec.price}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.appendChild(cardsEl);
    container.scrollTop = container.scrollHeight;

    // 绑定点击事件
    cardsEl.querySelectorAll('.rec-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url && url !== '#') {
          chrome.tabs.create({ url });
        }
      });
    });
  }

  // 切换功能面板
  toggleFeaturePanel(show) {
    const panel = document.getElementById('featurePanel');
    if (show === undefined) {
      panel.classList.toggle('hidden');
    } else {
      panel.classList.toggle('hidden', !show);
    }
  }

  // 处理功能
  async handleFeature(feature) {
    this.toggleFeaturePanel(false);

    switch (feature) {
      case 'predict':
        await this.handlePricePredict();
        break;
      case 'calendar':
        await this.handleSalesCalendar();
        break;
      case 'compare':
        await this.handleProductCompare();
        break;
      case 'recommend':
        await this.handleRecommendations();
        break;
      case 'budget':
        await this.handleBudget();
        break;
      case 'optimize':
        await this.handleCartOptimize();
        break;
    }
  }

  // 价格预测
  async handlePricePredict() {
    if (!this.currentProduct) {
      this.addMessage('请先打开一个商品页面，我才能进行价格预测哦~', 'ai', 'info');
      return;
    }

    this.showTyping();

    // 获取历史价格
    const history = await this.storage.getPriceHistory(this.currentProduct.id);

    // 进行预测
    const prediction = this.pricePredictor.predict(this.currentProduct, history, 30);

    this.hideTyping();

    let message = `📈 **${this.currentProduct.title.substring(0, 20)}... 价格预测**\n\n`;

    if (prediction.recommendation) {
      message += `${prediction.recommendation.emoji} **${prediction.recommendation.reason}**\n\n`;
    }

    if (prediction.upcomingSales && prediction.upcomingSales.length > 0) {
      const nextSale = prediction.upcomingSales[0];
      message += `📅 下次大促: ${nextSale.name} (${nextSale.daysUntil}天后)\n`;
      message += `💰 预计折扣: ${nextSale.discount * 100}%\n`;
    }

    message += `\n置信度: ${(prediction.confidence * 100).toFixed(0)}%`;

    this.addMessage(message, 'ai', prediction.recommendation?.action === 'buy_now' ? 'positive' : 'warning');
  }

  // 大促日历
  async handleSalesCalendar() {
    const upcoming = this.salesCalendar.getUpcomingSales(60);

    let message = '📅 **近期大促活动**\n\n';

    if (upcoming.length === 0) {
      message += '近期没有大促活动安排';
    } else {
      upcoming.slice(0, 5).forEach(sale => {
        const status = sale.isActive ? '🔥 进行中' : `⏳ ${sale.daysUntil}天后`;
        message += `**${sale.name}** ${status}\n`;
        message += `📆 ${sale.startDate.toLocaleDateString('zh-CN')} - ${sale.endDate.toLocaleDateString('zh-CN')}\n`;
        message += `💰 预计折扣: ${sale.discount}\n\n`;
      });
    }

    this.addMessage(message, 'ai', 'info');
  }

  // 商品对比
  async handleProductCompare() {
    const compareList = this.productComparator.getList();

    if (compareList.length < 2) {
      this.addMessage(
        '📊 **商品对比**\n\n当前对比列表商品不足。\n\n请在浏览商品时点击"添加对比"按钮，添加2-4件商品后再进行对比。',
        'ai',
        'info'
      );
      return;
    }

    this.showTyping();
    const comparison = await this.productComparator.generateComparison();
    this.hideTyping();

    if (!comparison.success) {
      this.addMessage(comparison.message, 'ai', 'warning');
      return;
    }

    let message = '📊 **商品对比结果**\n\n';

    message += '**价格对比:**\n';
    message += comparison.priceComparison.summary + '\n\n';

    message += '**综合推荐:**\n';
    message += `🏆 最佳选择: ${comparison.recommendation.overall.product.title.substring(0, 20)}...\n`;
    message += `💰 预算之选: ${comparison.recommendation.budget.product.title.substring(0, 20)}...\n`;
    message += `⭐ 品质之选: ${comparison.recommendation.quality.product.title.substring(0, 20)}...\n`;

    this.addMessage(message, 'ai', 'positive');
  }

  // 个性化推荐
  async handleRecommendations() {
    this.showTyping();
    const daily = await this.recommendationEngine.getDailyRecommendations();
    this.hideTyping();

    this.addMessage('✨ **今日个性推荐**\n\n根据您的浏览偏好，为您精选以下商品:', 'ai', 'info');

    // 显示推荐卡片
    this.showRecommendationCards(daily.personalized);
  }

  // 预算管理
  async handleBudget() {
    this.addMessage(
      '💰 **预算管理**\n\n此功能正在开发中...\n\n即将支持:\n• 设置月度预算\n• 消费追踪\n• 超支提醒\n• 消费分析报告',
      'ai',
      'info'
    );
  }

  // 凑单优化
  async handleCartOptimize() {
    this.addMessage(
      '🛒 **凑单优化**\n\n此功能正在开发中...\n\n即将支持:\n• 多平台价格对比\n• 自动计算最优方案\n• 满减凑单建议\n• 运费优化',
      'ai',
      'info'
    );
  }

  // 显示提示
  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 1000;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new ChatInterface();
});
