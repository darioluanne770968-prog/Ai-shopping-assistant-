/**
 * AI购物助手 - 设置页面脚本
 */

import { StorageManager } from '../modules/storage.js';

class OptionsPage {
  constructor() {
    this.storage = new StorageManager();
    this.init();
  }

  async init() {
    this.bindNavigation();
    await this.loadSettings();
    await this.loadStatistics();
    this.bindSettingEvents();
    this.bindDataEvents();
  }

  // 导航绑定
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        // 更新导航状态
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // 切换内容区域
        const targetSection = item.dataset.section;
        sections.forEach(section => {
          section.classList.remove('active');
          if (section.id === targetSection) {
            section.classList.add('active');
          }
        });
      });
    });
  }

  // 加载设置
  async loadSettings() {
    const settings = await this.storage.getSettings();

    // 通用设置
    document.getElementById('autoCompare').checked = settings.autoCompare !== false;
    document.getElementById('showFloatingPanel').checked = settings.showFloatingPanel !== false;
    document.getElementById('priceCheckInterval').value = settings.priceCheckInterval || 60;
    document.getElementById('theme').value = settings.theme || 'light';

    // 平台设置
    const platforms = settings.platforms || {};
    Object.keys(platforms).forEach(platform => {
      const checkbox = document.getElementById(`platform-${platform}`);
      if (checkbox) {
        checkbox.checked = platforms[platform];
      }
    });

    // 通知设置
    document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
    document.getElementById('priceDropNotify').checked = settings.priceDropNotify !== false;
    document.getElementById('targetPriceNotify').checked = settings.targetPriceNotify !== false;
    document.getElementById('couponNotify').checked = settings.couponNotify !== false;
    document.getElementById('notificationSound').checked = settings.notificationSound === true;
  }

  // 加载统计数据
  async loadStatistics() {
    const wishlist = await this.storage.getWishlist();
    const alerts = await this.storage.getAlerts();
    const stats = await this.storage.getStatistics();

    document.getElementById('wishlistCount').textContent = wishlist.length;
    document.getElementById('alertsCount').textContent = alerts.length;
    document.getElementById('totalSaved').textContent = `¥${(stats.totalSaved || 0).toFixed(2)}`;
    document.getElementById('comparisons').textContent = stats.comparisons || 0;
  }

  // 绑定设置变更事件
  bindSettingEvents() {
    // 通用设置
    const generalSettings = ['autoCompare', 'showFloatingPanel', 'priceCheckInterval', 'theme'];

    generalSettings.forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('change', async (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        await this.storage.saveSettings({ [id]: value });
        this.showSaveNotice();
      });
    });

    // 平台设置
    const platformCheckboxes = document.querySelectorAll('[id^="platform-"]');
    platformCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const platform = e.target.id.replace('platform-', '');
        const settings = await this.storage.getSettings();
        const platforms = settings.platforms || {};
        platforms[platform] = e.target.checked;
        await this.storage.saveSettings({ platforms });
        this.showSaveNotice();
      });
    });

    // 通知设置
    const notificationSettings = [
      'notificationsEnabled',
      'priceDropNotify',
      'targetPriceNotify',
      'couponNotify',
      'notificationSound'
    ];

    notificationSettings.forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('change', async (e) => {
        await this.storage.saveSettings({ [id]: e.target.checked });
        this.showSaveNotice();
      });
    });
  }

  // 绑定数据管理事件
  bindDataEvents() {
    // 导出数据
    document.getElementById('exportDataBtn').addEventListener('click', async () => {
      await this.exportData();
    });

    // 导入数据
    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('importInput').click();
    });

    document.getElementById('importInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.importData(file);
      }
    });

    // 清除数据
    document.getElementById('clearDataBtn').addEventListener('click', async () => {
      await this.clearData();
    });
  }

  // 导出数据
  async exportData() {
    try {
      const data = await this.storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-shopping-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this.showNotice('数据导出成功', 'success');
    } catch (error) {
      this.showNotice('导出失败: ' + error.message, 'error');
    }
  }

  // 导入数据
  async importData(file) {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = await this.storage.importData(e.target.result);
        if (result.success) {
          this.showNotice('数据导入成功', 'success');
          await this.loadSettings();
          await this.loadStatistics();
        } else {
          this.showNotice('导入失败: ' + result.error, 'error');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      this.showNotice('导入失败: ' + error.message, 'error');
    }
  }

  // 清除数据
  async clearData() {
    const confirmed = confirm('确定要清除所有数据吗？此操作不可恢复！');
    if (!confirmed) return;

    const doubleConfirm = confirm('最后确认：删除所有心愿单、提醒和历史数据？');
    if (!doubleConfirm) return;

    try {
      await this.storage.clearAll();
      await this.storage.initializeDefaults();
      await this.loadSettings();
      await this.loadStatistics();
      this.showNotice('数据已清除', 'success');
    } catch (error) {
      this.showNotice('清除失败: ' + error.message, 'error');
    }
  }

  // 显示保存提示
  showSaveNotice() {
    this.showNotice('设置已保存', 'success');
  }

  // 显示通知
  showNotice(message, type = 'info') {
    // 移除现有通知
    const existing = document.querySelector('.notice');
    if (existing) existing.remove();

    const notice = document.createElement('div');
    notice.className = `notice notice-${type}`;
    notice.textContent = message;
    notice.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1890ff'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notice);

    setTimeout(() => {
      notice.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notice.remove(), 300);
    }, 2000);
  }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
