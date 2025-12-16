/**
 * AI购物助手 - Background Service Worker
 * 处理后台任务、定时检查、通知等
 */

import { StorageManager } from '../modules/storage.js';
import { PriceComparison } from '../modules/price-comparison.js';
import { ImageSearchService } from '../modules/image-search.js';

class BackgroundService {
  constructor() {
    this.storage = new StorageManager();
    this.priceComparison = new PriceComparison();
    this.imageSearch = new ImageSearchService();

    this.init();
  }

  init() {
    // 安装时初始化
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });

    // 消息监听
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持通道开放以便异步响应
    });

    // 设置定时任务
    this.setupAlarms();

    // 定时任务触发
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // 创建右键菜单
    this.createContextMenu();
  }

  // 安装时的初始化
  async onInstalled(details) {
    if (details.reason === 'install') {
      // 首次安装
      await this.storage.initializeDefaults();

      // 打开欢迎页面
      chrome.tabs.create({
        url: 'options/welcome.html'
      });
    } else if (details.reason === 'update') {
      // 更新时的处理
      console.log('扩展已更新到版本:', chrome.runtime.getManifest().version);
    }
  }

  // 处理消息
  async handleMessage(message, sender, sendResponse) {
    const { action, data } = message;

    try {
      switch (action) {
        case 'imageSearch':
          const searchResults = await this.imageSearch.search(message.imageData);
          sendResponse(searchResults);
          break;

        case 'comparePrices':
          const prices = await this.priceComparison.compare(data);
          sendResponse({ success: true, prices });
          break;

        case 'addPriceHistory':
          await this.storage.addPriceHistory(data.productId, data.price);
          sendResponse({ success: true });
          break;

        case 'checkAlerts':
          await this.checkPriceAlerts();
          sendResponse({ success: true });
          break;

        case 'getSettings':
          const settings = await this.storage.getSettings();
          sendResponse({ success: true, settings });
          break;

        case 'saveSettings':
          await this.storage.saveSettings(data);
          sendResponse({ success: true });
          break;

        case 'parseLink':
          const parsed = await this.parseShortLink(data.link);
          sendResponse({ success: true, url: parsed });
          break;

        default:
          sendResponse({ success: false, error: '未知操作' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 设置定时任务
  setupAlarms() {
    // 每小时检查一次价格提醒
    chrome.alarms.create('checkPriceAlerts', {
      periodInMinutes: 60
    });

    // 每天更新一次价格历史
    chrome.alarms.create('updatePriceHistory', {
      periodInMinutes: 1440 // 24小时
    });
  }

  // 处理定时任务
  async handleAlarm(alarm) {
    switch (alarm.name) {
      case 'checkPriceAlerts':
        await this.checkPriceAlerts();
        break;

      case 'updatePriceHistory':
        await this.updateAllPriceHistory();
        break;
    }
  }

  // 检查价格提醒
  async checkPriceAlerts() {
    const alerts = await this.storage.getAlerts();

    for (const alert of alerts) {
      try {
        const currentPrice = await this.priceComparison.getCurrentPrice(alert);

        if (currentPrice <= alert.targetPrice) {
          // 发送通知
          this.sendPriceAlert(alert, currentPrice);

          // 更新提醒状态
          await this.storage.updateAlert(alert.id, {
            triggered: true,
            triggeredPrice: currentPrice,
            triggeredAt: new Date().toISOString()
          });
        }

        // 记录价格历史
        await this.storage.addPriceHistory(alert.productId, currentPrice);
      } catch (error) {
        console.error('检查价格提醒失败:', alert.id, error);
      }
    }
  }

  // 发送价格提醒通知
  sendPriceAlert(alert, currentPrice) {
    chrome.notifications.create(`price-alert-${alert.id}`, {
      type: 'basic',
      iconUrl: alert.image || 'assets/icons/icon128.png',
      title: '🎉 降价提醒',
      message: `${alert.title} 已降至 ¥${currentPrice}！`,
      buttons: [
        { title: '立即查看' },
        { title: '稍后提醒' }
      ],
      priority: 2
    });

    // 通知点击处理
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === `price-alert-${alert.id}`) {
        if (buttonIndex === 0) {
          chrome.tabs.create({ url: alert.url });
        }
        chrome.notifications.clear(notificationId);
      }
    });
  }

  // 更新所有商品的价格历史
  async updateAllPriceHistory() {
    const wishlist = await this.storage.getWishlist();

    for (const item of wishlist) {
      try {
        const currentPrice = await this.priceComparison.getCurrentPrice(item);
        await this.storage.addPriceHistory(item.id, currentPrice);

        // 更新心愿单中的当前价格
        if (currentPrice !== item.currentPrice) {
          await this.storage.updateWishlistItem(item.id, {
            previousPrice: item.currentPrice,
            currentPrice,
            priceChange: ((currentPrice - item.currentPrice) / item.currentPrice * 100).toFixed(1)
          });
        }
      } catch (error) {
        console.error('更新价格历史失败:', item.id, error);
      }
    }
  }

  // 创建右键菜单
  createContextMenu() {
    chrome.contextMenus.removeAll(() => {
      // 在图片上右键
      chrome.contextMenus.create({
        id: 'searchByImage',
        title: '以图搜商品',
        contexts: ['image']
      });

      // 在链接上右键
      chrome.contextMenus.create({
        id: 'parseLink',
        title: '解析商品链接',
        contexts: ['link']
      });

      // 选中文字右键
      chrome.contextMenus.create({
        id: 'searchProduct',
        title: '搜索商品: "%s"',
        contexts: ['selection']
      });
    });

    // 右键菜单点击处理
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  // 处理右键菜单点击
  async handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
      case 'searchByImage':
        // 以图搜商品
        const imageUrl = info.srcUrl;
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = async () => {
            const results = await this.imageSearch.search(reader.result);
            // 发送结果到popup或新标签页展示
            chrome.storage.local.set({ imageSearchResults: results });
            chrome.action.openPopup();
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('图片搜索失败:', error);
        }
        break;

      case 'parseLink':
        // 解析商品链接
        const url = await this.parseShortLink(info.linkUrl);
        if (url) {
          chrome.tabs.create({ url });
        }
        break;

      case 'searchProduct':
        // 搜索商品
        const searchTerm = info.selectionText;
        chrome.tabs.create({
          url: `https://s.taobao.com/search?q=${encodeURIComponent(searchTerm)}`
        });
        break;
    }
  }

  // 解析短链接/淘口令
  async parseShortLink(link) {
    // 淘口令格式检测
    const taokolingPattern = /[¥￥][\w]+[¥￥]/;
    const match = link.match(taokolingPattern);

    if (match) {
      // 解析淘口令
      try {
        const response = await fetch('https://api.example.com/parse-taokoling', {
          method: 'POST',
          body: JSON.stringify({ code: match[0] })
        });
        const data = await response.json();
        return data.url;
      } catch (error) {
        console.error('解析淘口令失败:', error);
        return null;
      }
    }

    // 短链接解析
    if (link.includes('tb.cn') || link.includes('jd.cn') || link.includes('pdd.cn')) {
      try {
        const response = await fetch(link, {
          method: 'HEAD',
          redirect: 'follow'
        });
        return response.url;
      } catch (error) {
        console.error('解析短链接失败:', error);
        return link;
      }
    }

    return link;
  }
}

// 初始化后台服务
new BackgroundService();
